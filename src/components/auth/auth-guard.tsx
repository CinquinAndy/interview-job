'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { LoginForm } from './login-form'

interface AuthGuardProps {
	children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
	const { isAuthenticated, checkAuth } = useAuth()
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		// Check auth on mount
		checkAuth()
		setIsLoading(false)
	}, [checkAuth])

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
