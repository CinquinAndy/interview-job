import type { AuthModel } from 'pocketbase'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pb } from '@/services/pocketbase.client'

interface AuthState {
	user: AuthModel | null
	token: string | null
	isAuthenticated: boolean
	login: (email: string, pass: string) => Promise<void>
	logout: () => void
	checkAuth: () => boolean
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, _get) => ({
			user: null,
			token: null,
			isAuthenticated: false,

			login: async (email, pass) => {
				const authData = await pb.collection('users').authWithPassword(email, pass)
				set({
					user: authData.record,
					token: authData.token,
					isAuthenticated: true,
				})
				// PocketBase handles cookies automatically via authStore
			},

			logout: () => {
				pb.authStore.clear()
				set({ user: null, token: null, isAuthenticated: false })
			},

			checkAuth: () => {
				const isValid = pb.authStore.isValid
				set({ isAuthenticated: isValid, user: pb.authStore.model })
				return isValid
			},
		}),
		{
			name: 'auth-storage',
			skipHydration: true, // Handle hydration manually if needed or let persist handle it
		}
	)
)
