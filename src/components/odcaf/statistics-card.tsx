'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Statistics {
	total: number
	byProvince?: Record<string, number>
	byType?: Record<string, number>
	note?: string
}

interface StatisticsCardProps {
	statistics: Statistics
}

export function StatisticsCard({ statistics }: StatisticsCardProps) {
	return (
		<Card className="w-full">
			<CardHeader className="pb-3">
				<CardTitle className="text-base">ODCAF Statistics</CardTitle>
				<CardDescription>Overview of the cultural facilities database</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
					<span className="text-sm font-medium">Total Facilities</span>
					<span className="text-2xl font-bold text-primary">{statistics.total.toLocaleString()}</span>
				</div>

				{statistics.byProvince && (
					<div className="space-y-2">
						<h4 className="text-sm font-medium">By Province/Territory</h4>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
							{Object.entries(statistics.byProvince)
								.sort(([, a], [, b]) => b - a)
								.map(([prov, count]) => (
									<div key={prov} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
										<span className="font-mono text-xs">{prov}</span>
										<span className="text-sm font-medium">{count.toLocaleString()}</span>
									</div>
								))}
						</div>
					</div>
				)}

				{statistics.note && <p className="text-xs text-muted-foreground italic">{statistics.note}</p>}
			</CardContent>
		</Card>
	)
}
