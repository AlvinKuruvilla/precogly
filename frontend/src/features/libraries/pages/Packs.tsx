/**
 * Pack Browser page for browsing and importing library packs.
 *
 * Simplified UI: One unified list of packs with a single "Import" button
 * that imports packs from YAML source files into the database.
 */

import { useState, useMemo } from 'react'
import {
  Package,
  Search,
  Loader2,
  Eye,
  Check,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PreviewPackDialog, ValidationWarningsDialog } from '@/features/libraries/components'
import {
  useAvailablePacksFromSource,
  useImportSinglePack,
  usePacks,
} from '@/features/libraries/api/packs'
import type { PackFilters, ValidationResult } from '@/features/libraries/types/packs'

// Unified pack type that can represent both source and database packs
interface UnifiedPack {
  slug: string
  name: string
  description: string
  version: string
  packType: string
  tier: string
  source: string
  tags: string[]
  componentCount: number
  threatCount: number
  taxonomyCount: number
  // Status
  isInDatabase: boolean
  isImported: boolean
  // IDs for API calls
  databaseId: number | null
}

export function Packs() {
  const [filters, setFilters] = useState<PackFilters>({})
  const [searchInput, setSearchInput] = useState('')
  // Preview state
  const [previewPackId, setPreviewPackId] = useState<number | null>(null)
  const [previewPackSlug, setPreviewPackSlug] = useState<string | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  // Track which pack is being imported
  const [importingSlug, setImportingSlug] = useState<string | null>(null)
  // Validation dialog state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)
  const [validationPackSlug, setValidationPackSlug] = useState<string | null>(null)

  // Fetch data from both sources
  const { data: dbPacks, isLoading: isLoadingDb } = usePacks(filters)
  const { data: sourcePacks, isLoading: isLoadingSource } = useAvailablePacksFromSource()

  // Mutations
  const importMutation = useImportSinglePack()

  // Merge source packs and database packs into unified list
  const unifiedPacks = useMemo(() => {
    const packs: UnifiedPack[] = []
    const seenSlugs = new Set<string>()

    // First, add all source packs (these are the authoritative list)
    if (sourcePacks?.packs) {
      for (const sp of sourcePacks.packs) {
        // Find matching database pack if exists
        const dbPack = dbPacks?.find((p) => p.slug === sp.slug)

        packs.push({
          slug: sp.slug,
          name: sp.name,
          description: sp.description,
          version: sp.version,
          packType: sp.packType,
          tier: sp.tier,
          source: sp.source,
          tags: sp.tags,
          componentCount: sp.componentCount,
          threatCount: sp.threatCount,
          taxonomyCount: sp.taxonomyCount,
          isInDatabase: sp.isInDatabase,
          isImported: sp.isInDatabase || (dbPack?.isImported ?? false),
          databaseId: dbPack?.id ?? null,
        })
        seenSlugs.add(sp.slug)
      }
    }

    // Add any database packs not in source (shouldn't happen normally, but just in case)
    if (dbPacks) {
      for (const dbPack of dbPacks) {
        if (!seenSlugs.has(dbPack.slug)) {
          packs.push({
            slug: dbPack.slug,
            name: dbPack.name,
            description: dbPack.description,
            version: dbPack.version,
            packType: dbPack.packType,
            tier: dbPack.tier,
            source: dbPack.source,
            tags: dbPack.tags,
            componentCount: 0,
            threatCount: 0,
            taxonomyCount: 0,
            isInDatabase: true,
            isImported: dbPack.isImported,
            databaseId: dbPack.id,
          })
        }
      }
    }

    // Apply search filter
    let filtered = packs
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = packs.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.tags.some((t) => t.toLowerCase().includes(search))
      )
    }

    // Apply type filter
    if (filters.packType) {
      filtered = filtered.filter((p) => p.packType === filters.packType)
    }

    // Apply tier filter
    if (filters.tier) {
      filtered = filtered.filter((p) => p.tier === filters.tier)
    }

    return filtered
  }, [sourcePacks, dbPacks, filters])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, search: searchInput || undefined }))
  }

  const handleFilterChange = (key: keyof PackFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }))
  }

  const handleImport = async (pack: UnifiedPack) => {
    setImportingSlug(pack.slug)
    try {
      await importMutation.mutateAsync({ slug: pack.slug, force: false })
      toast.success(`Successfully imported ${pack.name}`)
    } catch (error: unknown) {
      const errorObj = error as { status?: number; data?: unknown }
      const errorData = errorObj?.data as Record<string, unknown> | undefined
      // Show validation dialog for both 422 (warnings) and 400 (errors from validation)
      if ((errorObj?.status === 422 || errorObj?.status === 400) && errorData && 'warningCount' in errorData) {
        setValidationResult(errorData as unknown as ValidationResult)
        setValidationPackSlug(pack.slug)
        setValidationDialogOpen(true)
        return
      }
      const message = errorData?.message as string | undefined
      toast.error(message || 'Import failed')
    } finally {
      setImportingSlug(null)
    }
  }

  const handlePreview = (pack: UnifiedPack) => {
    if (pack.databaseId) {
      setPreviewPackId(pack.databaseId)
      setPreviewPackSlug(null)
    } else {
      setPreviewPackId(null)
      setPreviewPackSlug(pack.slug)
    }
    setPreviewDialogOpen(true)
  }

  const isLoading = isLoadingDb || isLoadingSource
  const importedCount = unifiedPacks.filter(p => p.isImported).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Library Packs</h1>
          <p className="text-muted-foreground">
            Browse and import pre-built content packs.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Package className="mr-2 h-4 w-4" />
          {importedCount} imported
        </Badge>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packs..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <div className="flex gap-2">
          <Select
            value={filters.packType ?? 'all'}
            onValueChange={(value) => handleFilterChange('packType', value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="threat">Threat</SelectItem>
              <SelectItem value="countermeasure">Countermeasure</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="template">Template</SelectItem>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="taxonomy">Taxonomy</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.tier ?? 'all'}
            onValueChange={(value) => handleFilterChange('tier', value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pack Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : unifiedPacks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unifiedPacks.map((pack) => (
            <UnifiedPackCard
              key={pack.slug}
              pack={pack}
              onImport={handleImport}
              onPreview={handlePreview}
              isImporting={importingSlug === pack.slug}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No packs found</h3>
          <p className="text-muted-foreground">
            {filters.search || filters.packType || filters.tier
              ? 'Try adjusting your search or filters.'
              : 'No library packs are available yet.'}
          </p>
        </div>
      )}

      {/* Preview Dialog */}
      <PreviewPackDialog
        packId={previewPackId}
        packSlug={previewPackSlug}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
      />

      {/* Validation Warnings Dialog */}
      <ValidationWarningsDialog
        validationResult={validationResult}
        open={validationDialogOpen}
        onOpenChange={(open) => {
          setValidationDialogOpen(open)
          if (!open) {
            setValidationResult(null)
            setValidationPackSlug(null)
          }
        }}
      />
    </div>
  )
}

/**
 * Unified pack card component.
 */
function UnifiedPackCard({
  pack,
  onImport,
  onPreview,
  isImporting,
}: {
  pack: UnifiedPack
  onImport: (pack: UnifiedPack) => void
  onPreview: (pack: UnifiedPack) => void
  isImporting: boolean
}) {
  const packTypeColors: Record<string, string> = {
    technology: 'bg-blue-100 text-blue-800',
    threat: 'bg-red-100 text-red-800',
    countermeasure: 'bg-green-100 text-green-800',
    compliance: 'bg-purple-100 text-purple-800',
    template: 'bg-yellow-100 text-yellow-800',
    full: 'bg-gray-100 text-gray-800',
    taxonomy: 'bg-teal-100 text-teal-800',
  }

  const tierColors: Record<string, string> = {
    free: 'bg-green-100 text-green-800',
    premium: 'bg-amber-100 text-amber-800',
    enterprise: 'bg-indigo-100 text-indigo-800',
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">{pack.name}</h3>
            <p className="text-sm text-muted-foreground">v{pack.version}</p>
          </div>
        </div>
        <Badge className={tierColors[pack.tier] || 'bg-gray-100'}>
          {pack.tier.toUpperCase()}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2">
        {pack.description || 'No description available'}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        <Badge
          variant="secondary"
          className={packTypeColors[pack.packType] || 'bg-gray-100'}
        >
          {pack.packType}
        </Badge>
        {pack.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
        {pack.tags.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{pack.tags.length - 3}
          </Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{pack.source === 'official' ? 'Official' : 'Community'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPreview(pack)}
            title="Preview pack contents"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {pack.isImported ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Check className="mr-1 h-3 w-3" />
              Imported
            </Badge>
          ) : (
            <Button
              size="sm"
              onClick={() => onImport(pack)}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Download className="mr-2 h-3 w-3" />
              )}
              Import
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
