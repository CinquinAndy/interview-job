'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { LoginForm } from './login-form'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/explorer']

interface AuthGuardProps {
	children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
	const pathname = usePathname()
	const { isAuthenticated, checkAuth } = useAuth()
	const [isLoading, setIsLoading] = useState(true)

	// Check if current route is public
	const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))

	useEffect(() => {
		// Check auth on mount
		checkAuth()
		setIsLoading(false)
	}, [checkAuth])

	// Skip auth check for public routes
	if (isPublicRoute) {
		return <>{children}</>
	}

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		)
	}

	if (!isAuthenticated) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<LoginForm />
			</div>
		)
	}

	return <>{children}</>
}
