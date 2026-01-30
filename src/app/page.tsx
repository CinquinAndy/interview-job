'use client'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export default function Home() {
	const { user, logout } = useAuth()

	return (
		<main className="flex min-h-screen flex-col p-8">
			{/* Header with user info and logout */}
			<div className="mb-8 flex items-center justify-between">
				<div className="text-sm text-muted-foreground">
					{user?.email && (
						<span>
							Logged in as <span className="font-medium text-foreground">{user.email}</span>
						</span>
					)}
				</div>
				<Button variant="outline" size="sm" onClick={logout}>
					Logout
				</Button>
			</div>

			{/* Main content */}
			<div className="flex flex-1 flex-col items-center justify-center gap-8">
				<div className="text-center">
					<h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
						Welcome to <span className="text-primary">ForHives</span>
					</h1>
					<p className="mt-6 text-lg text-muted-foreground">
						Modern Next.js 16 template with React 19, Tailwind 4, shadcn/ui, PocketBase, and Vercel AI SDK.
					</p>
				</div>

				<div className="flex gap-4">
					<Button variant="default" size="lg">
						Get Started
					</Button>
					<Button variant="outline" size="lg">
						Learn More
					</Button>
				</div>

				<div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					<FeatureCard title="🚀 Next.js 16" description="Latest App Router with React 19 and Server Components" />
					<FeatureCard title="🎨 Tailwind 4" description="CSS-first configuration with oklch colors and dark mode" />
					<FeatureCard title="🧩 shadcn/ui" description="Beautiful, accessible components built with Radix UI" />
					<FeatureCard title="🔧 Biome" description="Fast linting and formatting in a single tool" />
					<FeatureCard title="🗄️ PocketBase" description="Backend as a Service with authentication built-in" />
					<FeatureCard title="🤖 AI SDK" description="Vercel AI SDK with multi-provider support" />
				</div>
			</div>
		</main>
	)
}

function FeatureCard({ title, description }: { title: string; description: string }) {
	return (
		<div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
			<h3 className="text-lg font-semibold">{title}</h3>
			<p className="mt-2 text-sm text-muted-foreground">{description}</p>
		</div>
	)
}
