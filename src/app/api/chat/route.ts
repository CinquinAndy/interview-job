import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, streamText, tool, type UIMessage } from 'ai'
import * as z from 'zod'

// MCP Server URL - SSE transport endpoints
const MCP_BASE_URL = process.env.MCP_SERVER_URL || 'https://56ac73dbb9fa.ngrok-free.app'
const MCP_SSE_URL = `${MCP_BASE_URL}/sse`
const MCP_MESSAGES_URL = `${MCP_BASE_URL}/messages`

// MCP Session with persistent SSE connection
interface MCPSession {
	sessionId: string
	reader: ReadableStreamDefaultReader<Uint8Array>
	decoder: TextDecoder
	buffer: string
	pendingRequests: Map<
		number,
		{
			resolve: (value: string) => void
			reject: (error: Error) => void
		}
	>
	isProcessing: boolean
}

let mcpSession: MCPSession | null = null

// Process incoming SSE messages and resolve pending requests
async function processSSEStream(session: MCPSession) {
	if (session.isProcessing) return
	session.isProcessing = true

	try {
		while (true) {
			const { done, value } = await session.reader.read()
			if (done) {
				console.log('[MCP] SSE stream ended')
				break
			}

			session.buffer += session.decoder.decode(value, { stream: true })
			const lines = session.buffer.split('\n')
			session.buffer = lines.pop() || ''

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.substring(6).trim()
					if (!data || data.includes('sessionId=')) continue

					try {
						const json = JSON.parse(data)
						console.log('[MCP] SSE received:', JSON.stringify(json).substring(0, 200))

						// Check if this is a response to a pending request
						if (json.id !== undefined && session.pendingRequests.has(json.id)) {
							const pending = session.pendingRequests.get(json.id)
							if (!pending) continue
							session.pendingRequests.delete(json.id)

							if (json.error) {
								pending.reject(new Error(json.error.message || 'MCP error'))
							} else if (json.result?.content?.[0]?.text) {
								pending.resolve(json.result.content[0].text)
							} else if (json.result) {
								pending.resolve(JSON.stringify(json.result))
							} else {
								pending.resolve(JSON.stringify(json))
							}
						}
					} catch {
						// Not JSON, ignore
					}
				}
			}
		}
	} catch (error) {
		console.error('[MCP] SSE processing error:', error)
	} finally {
		session.isProcessing = false
	}
}

// Initialize MCP SSE session with persistent connection
async function initMCPSession(): Promise<MCPSession> {
	console.log('[MCP] Initializing SSE session with persistent connection...')

	const response = await fetch(MCP_SSE_URL, {
		method: 'GET',
		headers: {
			Accept: 'text/event-stream',
		},
	})

	if (!response.ok) {
		throw new Error(`Failed to connect to MCP SSE: ${response.statusText}`)
	}

	const reader = response.body?.getReader()
	if (!reader) {
		throw new Error('Failed to get SSE stream reader')
	}

	const decoder = new TextDecoder()
	let buffer = ''
	let sessionId: string | null = null

	// Read until we get the session ID
	while (!sessionId) {
		const { done, value } = await reader.read()
		if (done) break

		buffer += decoder.decode(value, { stream: true })
		const lines = buffer.split('\n')
		buffer = lines.pop() || ''

		for (const line of lines) {
			if (line.startsWith('data: ') && line.includes('sessionId=')) {
				const match = line.match(/sessionId=([a-f0-9-]+)/)
				if (match) {
					sessionId = match[1]
					console.log('[MCP] Got session ID:', sessionId)
					break
				}
			}
		}
	}

	if (!sessionId) {
		reader.cancel()
		throw new Error('No session ID received from MCP SSE')
	}

	// Create session object
	const session: MCPSession = {
		sessionId,
		reader,
		decoder,
		buffer,
		pendingRequests: new Map(),
		isProcessing: false,
	}

	// Start processing SSE stream in background (don't await)
	processSSEStream(session)

	// Send initialize message
	const initId = Date.now()
	const initPromise = new Promise<string>((resolve, reject) => {
		session.pendingRequests.set(initId, { resolve, reject })
		// Timeout after 10 seconds
		setTimeout(() => {
			if (session.pendingRequests.has(initId)) {
				session.pendingRequests.delete(initId)
				reject(new Error('Initialize timeout'))
			}
		}, 10000)
	})

	const initResponse = await fetch(`${MCP_MESSAGES_URL}?sessionId=${sessionId}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: initId,
			method: 'initialize',
			params: {
				protocolVersion: '2024-11-05',
				capabilities: {},
				clientInfo: {
					name: 'odcaf-explorer',
					version: '1.0.0',
				},
			},
		}),
	})

	if (!initResponse.ok) {
		const errorText = await initResponse.text()
		console.error('[MCP] Initialize POST failed:', errorText)
		throw new Error(`MCP initialize failed: ${initResponse.statusText}`)
	}

	// Wait for initialize response via SSE
	try {
		await initPromise
		console.log('[MCP] Session initialized successfully')
	} catch {
		console.log('[MCP] Initialize response timeout, continuing anyway...')
	}

	return session
}

// Get or create MCP session
async function getMCPSession(): Promise<MCPSession> {
	if (!mcpSession) {
		mcpSession = await initMCPSession()
	}
	return mcpSession
}

// Call MCP tool and wait for result via SSE
async function callMCPTool(toolName: string, args: Record<string, unknown>): Promise<string> {
	const session = await getMCPSession()
	const requestId = Date.now()

	console.log(`[MCP] Calling tool: ${toolName}`, args)

	// Create promise to wait for SSE response
	const resultPromise = new Promise<string>((resolve, reject) => {
		session.pendingRequests.set(requestId, { resolve, reject })

		// Timeout after 30 seconds
		setTimeout(() => {
			if (session.pendingRequests.has(requestId)) {
				session.pendingRequests.delete(requestId)
				reject(new Error(`Tool call timeout: ${toolName}`))
			}
		}, 30000)
	})

	// Send the tool call
	const response = await fetch(`${MCP_MESSAGES_URL}?sessionId=${session.sessionId}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: requestId,
			method: 'tools/call',
			params: {
				name: toolName,
				arguments: args,
			},
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		console.error(`[MCP] Tool call POST failed: ${response.status}`, errorText)

		// Session might have expired
		if (response.status === 400 || response.status === 404) {
			console.log('[MCP] Session expired, reinitializing...')
			mcpSession = null
			session.pendingRequests.delete(requestId)
			return callMCPTool(toolName, args) // Retry with new session
		}

		session.pendingRequests.delete(requestId)
		throw new Error(`MCP call failed: ${response.statusText}`)
	}

	// Wait for the result via SSE
	try {
		const result = await resultPromise
		console.log(`[MCP] Tool result received (${toolName}):`, result.substring(0, 500))
		return result
	} catch (error) {
		console.error(`[MCP] Tool call error (${toolName}):`, error)
		throw error
	}
}

export async function POST(request: Request) {
	const { messages }: { messages: UIMessage[] } = await request.json()

	const result = streamText({
		model: openai('gpt-4o-mini'),
		system: `You are a helpful assistant that can query the ODCAF database (Open Database of Cultural and Art Facilities) containing ~8000 Canadian cultural establishments.

You have access to tools to:
- Search facilities by query (name, type, city, province)
- Filter facilities by specific criteria (province, city, facility type)
- Get dataset statistics
- List facility types and provinces

When users ask about cultural facilities in Canada, use the appropriate tools to retrieve and present the data.
Always present data in a clear, organized manner. When showing multiple facilities, format them as a table.`,
		messages: await convertToModelMessages(messages),
		tools: {
			// MCP tool: search
			search: tool({
				description:
					'Search for cultural and art facilities in Canada by name, type, city, or province. Returns a list of matching facilities.',
				inputSchema: z.object({
					query: z.string().describe('Search query - can include facility name, type, city, or province code'),
					maxResults: z.number().optional().default(20).describe('Maximum number of results to return'),
				}),
				execute: async ({ query, maxResults }) => {
					try {
						return await callMCPTool('search', { query, maxResults })
					} catch {
						return JSON.stringify({
							error: 'MCP server not available',
							note: 'Unable to search facilities at this time',
						})
					}
				},
			}),

			// MCP tool: filter
			filter: tool({
				description:
					'Filter cultural facilities by province, city, and/or facility type. Use this for precise filtering when you know the exact criteria.',
				inputSchema: z.object({
					province: z
						.string()
						.optional()
						.describe('Province/territory code (AB, BC, MB, NB, NL, NS, NT, NU, ON, PE, QC, SK, YT)'),
					city: z.string().optional().describe('City name'),
					facilityType: z
						.string()
						.optional()
						.describe(
							'Facility type (museum, gallery, library, theatre, heritage or historic site, community cultural centre, performing arts facility, archive)'
						),
					limit: z.number().optional().default(50).describe('Maximum number of results'),
				}),
				execute: async ({ province, city, facilityType, limit }) => {
					try {
						return await callMCPTool('filter', { province, city, facilityType, limit })
					} catch {
						return JSON.stringify({
							error: 'MCP server not available',
							note: 'Unable to filter facilities at this time',
						})
					}
				},
			}),

			// MCP tool: stats
			stats: tool({
				description:
					'Get statistics about the cultural facilities database including total count, breakdown by type and province, and top cities.',
				inputSchema: z.object({}),
				execute: async () => {
					try {
						return await callMCPTool('stats', {})
					} catch {
						return JSON.stringify({
							total: 7972,
							note: 'MCP server not available - showing cached data',
						})
					}
				},
			}),

			// MCP tool: list_types
			listTypes: tool({
				description: 'List all available cultural facility types in the database.',
				inputSchema: z.object({}),
				execute: async () => {
					try {
						return await callMCPTool('list_types', {})
					} catch {
						return JSON.stringify({
							types: ['museum', 'gallery', 'library', 'theatre', 'heritage', 'archive'],
							note: 'MCP server not available - showing cached data',
						})
					}
				},
			}),

			// MCP tool: list_provinces
			listProvinces: tool({
				description: 'List all Canadian provinces and territories with their facility counts.',
				inputSchema: z.object({}),
				execute: async () => {
					try {
						return await callMCPTool('list_provinces', {})
					} catch {
						return JSON.stringify({
							provinces: ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'NU', 'YT'],
							note: 'MCP server not available - showing cached data',
						})
					}
				},
			}),

			// MCP tool: fetch
			fetchFacility: tool({
				description: 'Fetch the complete details of a cultural facility by its ID.',
				inputSchema: z.object({
					id: z.number().describe('The facility ID returned from a search'),
				}),
				execute: async ({ id }) => {
					try {
						return await callMCPTool('fetch', { id })
					} catch {
						return JSON.stringify({
							error: 'MCP server not available',
							note: 'Unable to fetch facility details at this time',
						})
					}
				},
			}),
		},
	})

	return result.toUIMessageStreamResponse()
}
