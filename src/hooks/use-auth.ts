'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'

export function useAuth() {
	const { user, isAuthenticated, login, logout, checkAuth } = useAuthStore()

	useEffect(() => {
		// Check auth on mount
		checkAuth()
	}, [checkAuth])

	return {
		user,
		isAuthenticated,
		login,
		logout,
		checkAuth,
	}
}
