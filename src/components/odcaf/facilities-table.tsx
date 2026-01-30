'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export interface Facility {
	Index: number
	Facility_Name: string
	ODCAF_Facility_Type: string
	City: string
	Prov_Terr: string
	Latitude?: number
	Longitude?: number
}

interface FacilitiesTableProps {
	facilities: Facility[]
	title?: string
	description?: string
}

export function FacilitiesTable({ facilities, title = 'Cultural Facilities', description }: FacilitiesTableProps) {
	if (!facilities || facilities.length === 0) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle className="text-base">{title}</CardTitle>
					{description && <CardDescription>{description}</CardDescription>}
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">No facilities found.</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="w-full">
			<CardHeader className="pb-3">
				<CardTitle className="text-base">{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
				<CardDescription>{facilities.length} facilities</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<div className="max-h-80 overflow-auto">
					<Table>
						<TableHeader className="sticky top-0 bg-card">
							<TableRow>
								<TableHead className="w-[40px]">#</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>City</TableHead>
								<TableHead className="w-[60px]">Prov</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{facilities.map((facility, index) => (
								<TableRow key={facility.Index || index}>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{facility.Index || index + 1}
									</TableCell>
									<TableCell className="font-medium">{facility.Facility_Name}</TableCell>
									<TableCell>
										<span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
											{facility.ODCAF_Facility_Type}
										</span>
									</TableCell>
									<TableCell>{facility.City}</TableCell>
									<TableCell className="font-mono">{facility.Prov_Terr}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
}
