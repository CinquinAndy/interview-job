'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Database, Loader2, MessageSquare, Send, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FacilitiesTable, type Facility, StatisticsCard } from '@/components/odcaf'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function ExplorerPage() {
	const [input, setInput] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	// Memoize transport to avoid recreation on each render
	const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), [])

	const { messages, sendMessage, status } = useChat({
		transport,
	})

	const isLoading = status === 'streaming' || status === 'submitted'

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		// Get value from ref as fallback (for automation tools that don't trigger React events)
		const textValue = input.trim() || inputRef.current?.value.trim() || ''
		if (textValue && !isLoading) {
			sendMessage({ text: textValue })
			setInput('')
			if (inputRef.current) inputRef.current.value = ''
		}
	}

	// Parse tool output for rendering
	const parseToolOutput = (output: unknown): { type: string; data: unknown } | null => {
		if (!output) return null

		// If output is a string, check if it's markdown (from MCP) or JSON
		if (typeof output === 'string') {
			// Check if it starts with markdown indicators
			if (output.startsWith('#') || output.includes('**') || output.includes('| ')) {
				return { type: 'markdown', data: output }
			}
			// Try to parse as JSON
			try {
				const parsed = JSON.parse(output)
				if (parsed.facilities) return { type: 'facilities', data: parsed }
				if (parsed.types) return { type: 'types', data: parsed }
				if (parsed.total !== undefined && parsed.byProvince) return { type: 'statistics', data: parsed }
				return { type: 'json', data: parsed }
			} catch {
				// Not JSON, treat as text
				return { type: 'text', data: output }
			}
		}

		// Handle object output
		const data = output as Record<string, unknown>
		if (data.facilities) return { type: 'facilities', data }
		if (data.types) return { type: 'types', data }
		if (data.total !== undefined && data.byProvince) return { type: 'statistics', data }
		return { type: 'raw', data }
	}

	// Render tool result based on type
	// biome-ignore lint/suspicious/noExplicitAny: UI message parts have dynamic tool types
	const renderToolResult = (part: any) => {
		if (!('output' in part) || !part.output) {
			return (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					<span>Querying database...</span>
				</div>
			)
		}

		const parsed = parseToolOutput(part.output)
		if (!parsed) return null

		switch (parsed.type) {
			case 'facilities': {
				const data = parsed.data as { facilities: Facility[]; total?: number; note?: string }
				return (
					<FacilitiesTable
						facilities={data.facilities}
						description={data.note || `Found ${data.total || data.facilities.length} facilities`}
					/>
				)
			}
			case 'statistics': {
				return <StatisticsCard statistics={parsed.data as { total: number; byProvince?: Record<string, number> }} />
			}
			case 'types': {
				const data = parsed.data as { types: string[]; note?: string }
				return (
					<Card className="w-full">
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Facility Types</CardTitle>
							{data.note && <CardDescription>{data.note}</CardDescription>}
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{data.types.map(type => (
									<span
										key={type}
										className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
									>
										{type}
									</span>
								))}
							</div>
						</CardContent>
					</Card>
				)
			}
			case 'markdown':
			case 'text': {
				const text = parsed.data as string
				return (
					<div className="w-full rounded-lg border bg-card p-4 text-card-foreground shadow">
						<pre className="whitespace-pre-wrap text-sm font-mono">{text}</pre>
					</div>
				)
			}
			default:
				return (
					<Card className="w-full">
						<CardContent className="p-4">
							<pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(parsed.data, null, 2)}</pre>
						</CardContent>
					</Card>
				)
		}
	}

	return (
		<div className="flex h-screen flex-col bg-gradient-to-b from-background to-muted/20">
			{/* Header */}
			<header className="flex-shrink-0 border-b bg-background/80 backdrop-blur-sm">
				<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Database className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h1 className="text-lg font-semibold">ODCAF Explorer</h1>
							<p className="text-xs text-muted-foreground">Open Database of Cultural and Art Facilities</p>
						</div>
					</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Sparkles className="h-4 w-4" />
						<span>Powered by AI + MCP</span>
						<span className="ml-2 rounded bg-muted px-2 py-1">{messages.length} msgs</span>
					</div>
				</div>
			</header>

			{/* Chat Area */}
			<div className="flex-1 overflow-auto">
				<div className="mx-auto max-w-5xl px-4 py-6">
					{messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
								<MessageSquare className="h-8 w-8 text-primary" />
							</div>
							<h2 className="mb-2 text-xl font-semibold">Explore Canadian Cultural Facilities</h2>
							<p className="mb-8 max-w-md text-sm text-muted-foreground">
								Ask questions about ~8000 museums, galleries, theatres, libraries, and cultural centres across Canada.
							</p>
							<div className="grid gap-3 sm:grid-cols-2">
								{[
									'Show me all museums in Toronto',
									'What types of cultural facilities exist?',
									'Give me statistics about the database',
									'Find art galleries in British Columbia',
								].map(suggestion => (
									<Button
										key={suggestion}
										variant="outline"
										className="h-auto justify-start whitespace-normal px-4 py-3 text-left text-sm"
										onClick={() => {
											sendMessage({ text: suggestion })
										}}
									>
										{suggestion}
									</Button>
								))}
							</div>
						</div>
					) : (
						<div className="space-y-4">
							{messages.map(message => (
								<div
									key={message.id}
									className={`rounded-lg p-4 ${
										message.role === 'user'
											? 'ml-auto max-w-[80%] bg-primary text-primary-foreground'
											: 'mr-auto max-w-full bg-muted'
									}`}
								>
									<div className="mb-2 text-xs font-medium opacity-70">
										{message.role === 'user' ? 'You' : 'AI Assistant'}
									</div>
									{message.parts?.map((part, i) => {
										if (part.type === 'text' && part.text) {
											return (
												<div key={i} className="prose prose-sm dark:prose-invert max-w-none">
													<pre className="whitespace-pre-wrap font-sans text-sm">{part.text}</pre>
												</div>
											)
										}
										if (part.type.startsWith('tool-')) {
											return (
												<div key={i} className="mt-3 rounded border bg-background p-3">
													<div className="mb-2 text-xs font-medium text-muted-foreground">
														Tool: {part.type.replace('tool-', '')}
													</div>
													{renderToolResult(part)}
												</div>
											)
										}
										return null
									})}
								</div>
							))}
							<div ref={messagesEndRef} />
						</div>
					)}
				</div>
			</div>

			{/* Input Area */}
			<div className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm">
				<form onSubmit={handleSubmit} className="mx-auto flex max-w-5xl gap-3 px-4 py-4">
					<Input
						ref={inputRef}
						value={input}
						onChange={e => setInput(e.target.value)}
						placeholder="Ask about Canadian cultural facilities..."
						disabled={isLoading}
						className="flex-1"
					/>
					<Button type="submit" disabled={isLoading} size="icon">
						{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
					</Button>
				</form>
			</div>
		</div>
	)
}
