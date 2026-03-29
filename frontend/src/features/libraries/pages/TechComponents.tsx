/**
 * Tech Components library page.
 */

import { Search, Server, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PackBadge } from '@/features/libraries/components'
import { useComponentLibraries } from '@/features/libraries/api/libraries'

export function TechComponents() {
  const { data: components, isLoading } = useComponentLibraries()
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()

  // Get pack filter from URL query params
  const packIdFilter = searchParams.get('packId')
  const packNameFilter = searchParams.get('packName')
  const packId = packIdFilter ? parseInt(packIdFilter, 10) : null

  const filteredComponents = useMemo(() => {
    let result = components ?? []

    // Filter by pack if specified
    if (packId !== null) {
      result = result.filter((c) => c.sourcePack === packId)
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.category.toLowerCase().includes(searchLower) ||
          c.provider?.toLowerCase().includes(searchLower)
      )
    }

    return result
  }, [components, packId, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Tech Components</h1>
        <p className="text-muted-foreground">
          Browse technology components like databases, servers, and cloud services.
        </p>
      </div>

      {/* Pack Filter Banner */}
      {packId !== null && packNameFilter && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <p className="text-sm">
            Showing components from <strong>{packNameFilter}</strong>
          </p>
          <Button asChild variant="ghost" size="sm">
            <Link to="/tech-components">
              <X className="mr-1 h-4 w-4" />
              Clear filter
            </Link>
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search components..."
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
      ) : filteredComponents && filteredComponents.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Source Pack</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComponents.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{component.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{component.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {component.componentType}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {component.provider || '—'}
                  </TableCell>
                  <TableCell>
                    <PackBadge
                      packName={component.sourcePackName}
                      packSlug={component.sourcePackSlug}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No components found</h3>
          <p className="text-muted-foreground">
            {search
              ? 'Try adjusting your search.'
              : 'Install a library pack to add components.'}
          </p>
        </div>
      )}
    </div>
  )
}
