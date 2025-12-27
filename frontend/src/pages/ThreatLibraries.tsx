/**
 * Threat Libraries page.
 */

import { Search, ShieldAlert } from 'lucide-react'
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
import { useThreatLibraries } from '@/api/libraries'

const strideCategoryLabels: Record<string, string> = {
  spoofing: 'Spoofing',
  tampering: 'Tampering',
  repudiation: 'Repudiation',
  information_disclosure: 'Info Disclosure',
  denial_of_service: 'DoS',
  elevation_of_privilege: 'Privilege Escalation',
}

const strideCategoryColors: Record<string, string> = {
  spoofing: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  tampering: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  repudiation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  information_disclosure: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  denial_of_service: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  elevation_of_privilege: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
}

export function ThreatLibraries() {
  const { data: threats, isLoading } = useThreatLibraries()
  const [search, setSearch] = useState('')

  const filteredThreats = threats?.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.stride_category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Threat Libraries</h1>
        <p className="text-muted-foreground">
          Browse known threats categorized by STRIDE methodology.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search threats..."
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
      ) : filteredThreats && filteredThreats.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>STRIDE Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Source Pack</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredThreats.map((threat) => (
                <TableRow key={threat.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{threat.name}</span>
                      </div>
                      {threat.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {threat.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={strideCategoryColors[threat.stride_category] || ''}
                      variant="secondary"
                    >
                      {strideCategoryLabels[threat.stride_category] || threat.stride_category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {threat.source || '—'}
                  </TableCell>
                  <TableCell>
                    <PackBadge
                      packName={threat.source_pack_name}
                      packSlug={threat.source_pack_slug}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No threats found</h3>
          <p className="text-muted-foreground">
            {search
              ? 'Try adjusting your search.'
              : 'Install a library pack to add threats.'}
          </p>
        </div>
      )}
    </div>
  )
}
