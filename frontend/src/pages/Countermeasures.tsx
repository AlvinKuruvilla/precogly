/**
 * Countermeasures library page.
 */

import { Search, Shield } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PackBadge } from '@/components/packs'
import { useCountermeasureLibraries } from '@/api/libraries'

const controlTypeLabels: Record<string, string> = {
  preventive: 'Preventive',
  detective: 'Detective',
  corrective: 'Corrective',
  compensating: 'Compensating',
}

const controlTypeColors: Record<string, string> = {
  preventive: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  detective: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  corrective: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  compensating: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

const costColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function Countermeasures() {
  const { data: countermeasures, isLoading } = useCountermeasureLibraries()
  const [search, setSearch] = useState('')

  const filteredCountermeasures = countermeasures?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.controlType.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Countermeasures</h1>
        <p className="text-muted-foreground">
          Browse security controls and mitigation strategies.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search countermeasures..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : filteredCountermeasures && filteredCountermeasures.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Control Type</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Source Pack</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCountermeasures.map((countermeasure) => (
                <TableRow key={countermeasure.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{countermeasure.name}</span>
                      </div>
                      {countermeasure.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {countermeasure.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={controlTypeColors[countermeasure.controlType] || ''}
                      variant="secondary"
                    >
                      {controlTypeLabels[countermeasure.controlType] || countermeasure.controlType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={costColors[countermeasure.cost] || ''}
                      variant="secondary"
                    >
                      {countermeasure.cost.charAt(0).toUpperCase() + countermeasure.cost.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PackBadge
                      packName={countermeasure.sourcePackName}
                      packSlug={countermeasure.sourcePackSlug}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No countermeasures found</h3>
          <p className="text-muted-foreground">
            {search
              ? 'Try adjusting your search.'
              : 'Install a library pack to add countermeasures.'}
          </p>
        </div>
      )}
    </div>
  )
}
