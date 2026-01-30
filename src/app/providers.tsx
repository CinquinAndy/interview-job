'use client'

import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/auth'

export function Providers({ children }: { children: ReactNode }) {
	return <AuthGuard>{children}</AuthGuard>
}
