import type { ReactNode } from 'react'

// No auth guard for the explorer page - it's a public demo
export default function ExplorerLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
