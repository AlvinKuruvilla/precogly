/**
 * Compliance Frameworks page - browse and view compliance frameworks.
 */

import { useState } from 'react'
import { Search, ChevronRight, FileText, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFrameworks, useFrameworkRequirements } from '@/features/compliance/api/compliance'
import type { Framework } from '@/features/compliance/types/compliance'

export function Frameworks() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null)

  const { data: frameworks, isLoading, isError } = useFrameworks()
  const { data: requirements, isLoading: isLoadingRequirements } = useFrameworkRequirements(
    selectedFramework?.id ?? null
  )

  // Filter frameworks by search query
  const filteredFrameworks = frameworks?.filter((fw) => {
    const query = searchQuery.toLowerCase()
    return (
      fw.name.toLowerCase().includes(query) ||
      fw.issuer.toLowerCase().includes(query) ||
      fw.description.toLowerCase().includes(query)
    )
  })

  // Group requirements by parent (top-level vs children)
  const topLevelRequirements = requirements?.filter((r) => r.parent === null) ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load frameworks</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Compliance Frameworks</h1>
        <p className="text-muted-foreground">
          Browse compliance frameworks and their requirements. These frameworks help map countermeasures to regulatory standards.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search frameworks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Frameworks Grid */}
      {filteredFrameworks && filteredFrameworks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFrameworks.map((framework) => (
            <Card
              key={framework.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedFramework(framework)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{framework.name}</CardTitle>
                    <CardDescription>{framework.issuer}</CardDescription>
                  </div>
                  <Badge variant="outline">{framework.version}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {framework.description || 'No description available'}
                </p>
                <div className="flex items-center mt-4 text-sm text-primary">
                  <FileText className="h-4 w-4 mr-1" />
                  View Requirements
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? 'No frameworks match your search' : 'No frameworks available'}
          </p>
        </div>
      )}

      {/* Requirements Dialog */}
      <Dialog open={selectedFramework !== null} onOpenChange={() => setSelectedFramework(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFramework?.name}
              <Badge variant="outline">{selectedFramework?.version}</Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedFramework?.issuer} - {selectedFramework?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {isLoadingRequirements ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : topLevelRequirements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Section</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLevelRequirements.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {req.sectionCode}
                      </TableCell>
                      <TableCell className="text-sm">{req.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No requirements defined for this framework</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
