/**
 * Unified Libraries page combining Catalog (browse packs) and Imported (manage) views.
 * Simplified for single-organization deployment.
 */

import { useState, useMemo, useEffect } from 'react'
import {
  Package,
  Search,
  Loader2,
  Eye,
  Check,
  Download,
  ChevronDown,
  ChevronRight,
  Server,
  Shield,
  Bug,
  ClipboardList,
} from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { PreviewPackDialog } from '@/components/packs'
import {
  useAvailablePacksFromSource,
  useImportSinglePack,
  usePacks,
  usePackOverlays,
} from '@/api/packs'
import { useComponentLibraries, useThreatLibraries, useCountermeasureLibraries, useRequirements } from '@/api/libraries'
import type { PackFilters } from '@/types/packs'
import { Link } from 'react-router-dom'

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
  isInDatabase: boolean
  isImported: boolean
  databaseId: number | null
}

export function Libraries() {
  const [activeTab, setActiveTab] = useState('catalog')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Libraries</h1>
        <p className="text-muted-foreground">
          Browse and manage library packs.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="imported">Imported</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-6">
          <CatalogView />
        </TabsContent>

        <TabsContent value="imported" className="mt-6">
          <ImportedView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Catalog view - browse and import available packs
 */
function CatalogView() {
  const [filters, setFilters] = useState<PackFilters>({})
  const [searchInput, setSearchInput] = useState('')
  const [previewPackId, setPreviewPackId] = useState<number | null>(null)
  const [previewPackSlug, setPreviewPackSlug] = useState<string | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [importingSlug, setImportingSlug] = useState<string | null>(null)
  const [installDialogPack, setInstallDialogPack] = useState<UnifiedPack | null>(null)

  const { data: dbPacks, isLoading: isLoadingDb } = usePacks(filters)
  const { data: sourcePacks, isLoading: isLoadingSource } = useAvailablePacksFromSource()

  const importMutation = useImportSinglePack()

  const unifiedPacks = useMemo(() => {
    const packs: UnifiedPack[] = []
    const seenSlugs = new Set<string>()

    if (sourcePacks?.packs) {
      for (const sp of sourcePacks.packs) {
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
          isInDatabase: sp.isInDatabase,
          isImported: sp.isInDatabase || (dbPack?.isImported ?? false),
          databaseId: dbPack?.id ?? null,
        })
        seenSlugs.add(sp.slug)
      }
    }

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
            isInDatabase: true,
            isImported: dbPack.isImported,
            databaseId: dbPack.id,
          })
        }
      }
    }

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
    if (filters.packType) {
      filtered = filtered.filter((p) => p.packType === filters.packType)
    }
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

  const handleImportClick = (pack: UnifiedPack) => {
    // Open the import dialog to show overlay options
    setInstallDialogPack(pack)
  }

  const handleImportConfirm = async (
    pack: UnifiedPack,
    selectedOverlays: string[] | null
  ) => {
    setImportingSlug(pack.slug)
    setInstallDialogPack(null)
    try {
      // Use import_single to support selective overlays
      // Use force=true if pack is already in database to re-import with new overlay selection
      await importMutation.mutateAsync({
        slug: pack.slug,
        force: pack.isInDatabase,
        selectedOverlays,
      })
    } catch (error) {
      console.error('Import failed:', error)
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

  return (
    <div className="space-y-6">
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
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : unifiedPacks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unifiedPacks.map((pack) => (
            <PackCard
              key={pack.slug}
              pack={pack}
              onImport={handleImportClick}
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

      <PreviewPackDialog
        packId={previewPackId}
        packSlug={previewPackSlug}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
      />

      <ImportPackDialog
        pack={installDialogPack}
        open={installDialogPack !== null}
        onOpenChange={(open) => !open && setInstallDialogPack(null)}
        onConfirm={handleImportConfirm}
      />
    </div>
  )
}

/**
 * Dialog for importing a pack with overlay selection
 */
function ImportPackDialog({
  pack,
  open,
  onOpenChange,
  onConfirm,
}: {
  pack: UnifiedPack | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (pack: UnifiedPack, selectedOverlays: string[] | null) => void
}) {
  const { data: overlaysData, isLoading: loadingOverlays } = usePackOverlays(
    pack?.slug ?? null
  )
  const [selectedOverlays, setSelectedOverlays] = useState<Set<string>>(new Set())

  // Reset selection when pack changes
  useEffect(() => {
    if (overlaysData?.overlays) {
      // Default: select all overlays that have their framework installed
      const availableOverlays = overlaysData.overlays
        .filter((o) => o.frameworkExists)
        .map((o) => o.frameworkId)
      setSelectedOverlays(new Set(availableOverlays))
    }
  }, [overlaysData])

  const toggleOverlay = (frameworkId: string) => {
    setSelectedOverlays((prev) => {
      const next = new Set(prev)
      if (next.has(frameworkId)) {
        next.delete(frameworkId)
      } else {
        next.add(frameworkId)
      }
      return next
    })
  }

  const handleImport = () => {
    if (!pack) return
    // If there are no overlays, pass null to load all (default behavior)
    // If there are overlays, pass the selected list
    const overlays =
      (overlaysData?.overlays.length ?? 0) > 0
        ? Array.from(selectedOverlays)
        : null
    onConfirm(pack, overlays)
  }

  const hasOverlays = (overlaysData?.overlays.length ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import {pack?.name}</DialogTitle>
          <DialogDescription>
            {hasOverlays
              ? 'Select which compliance framework overlays to include with this pack.'
              : `Import ${pack?.name} v${pack?.version} to make its content available.`}
          </DialogDescription>
        </DialogHeader>

        {loadingOverlays ? (
          <div className="py-4 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : hasOverlays ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Framework overlays map countermeasures to compliance requirements.
              Overlays for frameworks you haven&apos;t imported are disabled.
            </p>
            <div className="space-y-3">
              {overlaysData?.overlays.map((overlay) => (
                <div
                  key={overlay.frameworkId}
                  className="flex items-start gap-3"
                >
                  <Checkbox
                    id={overlay.frameworkId}
                    checked={selectedOverlays.has(overlay.frameworkId)}
                    onCheckedChange={() => toggleOverlay(overlay.frameworkId)}
                    disabled={!overlay.frameworkExists}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={overlay.frameworkId}
                      className={
                        !overlay.frameworkExists
                          ? 'text-muted-foreground'
                          : ''
                      }
                    >
                      {overlay.frameworkName}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {overlay.mappingCount} mappings
                      {!overlay.frameworkExists && (
                        <span className="ml-2 text-amber-600">
                          (framework not imported)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              This pack includes {pack?.componentCount ?? 0} components and{' '}
              {pack?.threatCount ?? 0} threats.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport}>
            <Download className="mr-2 h-4 w-4" />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Pack card component for the catalog view
 */
function PackCard({
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
  }

  const tierColors: Record<string, string> = {
    free: 'bg-green-100 text-green-800',
    premium: 'bg-amber-100 text-amber-800',
    enterprise: 'bg-indigo-100 text-indigo-800',
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
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

      <p className="text-sm text-muted-foreground line-clamp-2">
        {pack.description || 'No description available'}
      </p>

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
            <Button size="sm" onClick={() => onImport(pack)} disabled={isImporting}>
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

/**
 * Imported view - pack-centric expandable list of imported content
 */
function ImportedView() {
  const { data: dbPacks, isLoading } = usePacks({})
  const [expandedPacks, setExpandedPacks] = useState<Set<number>>(new Set())

  // Filter to only imported packs
  const importedPacks = useMemo(() => {
    return dbPacks?.filter(p => p.isImported) ?? []
  }, [dbPacks])

  const toggleExpanded = (packId: number) => {
    setExpandedPacks((prev) => {
      const next = new Set(prev)
      if (next.has(packId)) {
        next.delete(packId)
      } else {
        next.add(packId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (importedPacks.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No packs imported</h3>
        <p className="text-muted-foreground mb-4">
          Import library packs from the Catalog to add pre-built components, threats, and countermeasures.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {importedPacks.map((pack) => (
        <ImportedPackRow
          key={pack.id}
          pack={pack}
          isExpanded={expandedPacks.has(pack.id)}
          onToggleExpand={() => toggleExpanded(pack.id)}
        />
      ))}
    </div>
  )
}

/**
 * Expandable row for an imported pack showing its contents
 */
function ImportedPackRow({
  pack,
  isExpanded,
  onToggleExpand,
}: {
  pack: {
    id: number
    slug: string
    name: string
    version: string
    packType: string
    description: string
  }
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const packTypeColors: Record<string, string> = {
    technology: 'bg-blue-100 text-blue-800',
    threat: 'bg-red-100 text-red-800',
    countermeasure: 'bg-green-100 text-green-800',
    compliance: 'bg-purple-100 text-purple-800',
    template: 'bg-yellow-100 text-yellow-800',
    full: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="border rounded-lg">
      {/* Header Row */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="p-2 bg-muted rounded-lg">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">{pack.name}</h3>
            <p className="text-sm text-muted-foreground">v{pack.version}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={packTypeColors[pack.packType] || 'bg-gray-100'}
          >
            {pack.packType}
          </Badge>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Check className="mr-1 h-3 w-3" />
            Imported
          </Badge>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t px-4 py-3 bg-muted/30">
          <PackContents packId={pack.id} packName={pack.name} />
        </div>
      )}
    </div>
  )
}

/**
 * Shows the contents of a pack (components, threats, countermeasures, requirements)
 */
function PackContents({
  packId,
  packName,
}: {
  packId: number
  packName: string
}) {
  const { data: allComponents, isLoading: loadingComponents } = useComponentLibraries()
  const { data: allThreats, isLoading: loadingThreats } = useThreatLibraries()
  const { data: allCountermeasures, isLoading: loadingCountermeasures } = useCountermeasureLibraries()
  const { data: allRequirements, isLoading: loadingRequirements } = useRequirements()

  const isLoading = loadingComponents || loadingThreats || loadingCountermeasures || loadingRequirements

  // Filter by packId (sourcePack is the pack's database ID)
  const components = useMemo(
    () => allComponents?.filter((c) => c.sourcePack === packId) ?? [],
    [allComponents, packId]
  )
  const threats = useMemo(
    () => allThreats?.filter((t) => t.sourcePack === packId) ?? [],
    [allThreats, packId]
  )
  const countermeasures = useMemo(
    () => allCountermeasures?.filter((cm) => cm.sourcePack === packId) ?? [],
    [allCountermeasures, packId]
  )
  const requirements = useMemo(
    () => allRequirements?.filter((r) => r.sourcePack === packId) ?? [],
    [allRequirements, packId]
  )

  if (isLoading) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
        Loading pack contents...
      </div>
    )
  }

  const hasComponents = components.length > 0
  const hasThreats = threats.length > 0
  const hasCountermeasures = countermeasures.length > 0
  const hasRequirements = requirements.length > 0

  if (!hasComponents && !hasThreats && !hasCountermeasures && !hasRequirements) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        No content in this pack
      </div>
    )
  }

  // Build URLs with pack filter
  const encodedPackName = encodeURIComponent(packName)
  const componentsUrl = `/tech-components?packId=${packId}&packName=${encodedPackName}`
  const threatsUrl = `/threat-libraries?packId=${packId}&packName=${encodedPackName}`
  const countermeasuresUrl = `/countermeasures?packId=${packId}&packName=${encodedPackName}`

  // Determine grid columns based on content types present
  const contentTypeCount = [hasComponents, hasThreats, hasCountermeasures, hasRequirements].filter(Boolean).length
  const gridCols = contentTypeCount === 1 ? 'grid-cols-1' : contentTypeCount === 2 ? 'md:grid-cols-2' : contentTypeCount === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      {/* Components */}
      {hasComponents && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4 text-blue-600" />
              Components ({components.length})
            </div>
            <Link
              to={componentsUrl}
              className="text-xs text-primary hover:underline"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {components.slice(0, 10).map((c) => (
              <div
                key={c.id}
                className="text-sm text-muted-foreground truncate pl-6"
                title={c.name}
              >
                {c.name}
              </div>
            ))}
            {components.length > 10 && (
              <Link
                to={componentsUrl}
                className="text-xs text-primary hover:underline pl-6 block"
              >
                +{components.length - 10} more
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Threats */}
      {hasThreats && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bug className="h-4 w-4 text-red-600" />
              Threats ({threats.length})
            </div>
            <Link
              to={threatsUrl}
              className="text-xs text-primary hover:underline"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {threats.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="text-sm text-muted-foreground truncate pl-6"
                title={t.name}
              >
                {t.name}
              </div>
            ))}
            {threats.length > 10 && (
              <Link
                to={threatsUrl}
                className="text-xs text-primary hover:underline pl-6 block"
              >
                +{threats.length - 10} more
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Countermeasures */}
      {hasCountermeasures && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-green-600" />
              Countermeasures ({countermeasures.length})
            </div>
            <Link
              to={countermeasuresUrl}
              className="text-xs text-primary hover:underline"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {countermeasures.slice(0, 10).map((cm) => (
              <div
                key={cm.id}
                className="text-sm text-muted-foreground truncate pl-6"
                title={cm.name}
              >
                {cm.name}
              </div>
            ))}
            {countermeasures.length > 10 && (
              <Link
                to={countermeasuresUrl}
                className="text-xs text-primary hover:underline pl-6 block"
              >
                +{countermeasures.length - 10} more
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Requirements */}
      {hasRequirements && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList className="h-4 w-4 text-purple-600" />
            Requirements ({requirements.length})
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {requirements.map((r) => (
              <div
                key={r.id}
                className="text-sm text-muted-foreground truncate pl-6"
                title={`${r.sectionCode}: ${r.description}`}
              >
                {r.sectionCode}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
