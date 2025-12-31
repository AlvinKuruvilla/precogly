/**
 * Pack Browser page for browsing and installing library packs.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  Search,
  RefreshCw,
  FolderSync,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Eye,
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PackCard, InstallPackDialog, PreviewPackDialog } from '@/components/packs'
import {
  usePacks,
  useInstalledPacks,
  useAvailablePacksFromSource,
  useSyncPacksFromSource,
  useImportSinglePack,
} from '@/api/packs'
import type { SourcePackInfo } from '@/api/packs'
import type { LibraryPackListItem, PackFilters } from '@/types/packs'

export function Packs() {
  const [filters, setFilters] = useState<PackFilters>({})
  const [searchInput, setSearchInput] = useState('')
  const [selectedPack, setSelectedPack] = useState<LibraryPackListItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showSourcePacks, setShowSourcePacks] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  // Preview state
  const [previewPackId, setPreviewPackId] = useState<number | null>(null)
  const [previewPackSlug, setPreviewPackSlug] = useState<string | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)

  const { data: packs, isLoading, refetch: refetchPacks } = usePacks(filters)
  const { data: installedPacks } = useInstalledPacks()
  const {
    data: sourcePacks,
    isLoading: isLoadingSource,
    refetch: refetchSourcePacks,
  } = useAvailablePacksFromSource()
  const syncMutation = useSyncPacksFromSource()
  const importMutation = useImportSinglePack()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, search: searchInput || undefined }))
  }

  const handleInstall = (pack: LibraryPackListItem) => {
    setSelectedPack(pack)
    setDialogOpen(true)
  }

  const handleFilterChange = (key: keyof PackFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }))
  }

  const handleSyncFromSource = async () => {
    setSyncResult(null)
    try {
      const result = await syncMutation.mutateAsync({ force: false })
      setSyncResult({
        success: true,
        message: result.message,
      })
      // Refresh the packs list
      refetchPacks()
      refetchSourcePacks()
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      })
    }
  }

  const handleImportSingle = async (slug: string) => {
    try {
      await importMutation.mutateAsync({ slug, force: false })
      refetchPacks()
      refetchSourcePacks()
    } catch (error) {
      console.error('Import failed:', error)
    }
  }

  const handlePreviewDatabasePack = (pack: LibraryPackListItem) => {
    setPreviewPackId(pack.id)
    setPreviewPackSlug(null)
    setPreviewDialogOpen(true)
  }

  const handlePreviewSourcePack = (slug: string) => {
    setPreviewPackId(null)
    setPreviewPackSlug(slug)
    setPreviewDialogOpen(true)
  }

  const installedCount = installedPacks?.length ?? 0
  const packsNotInDb = sourcePacks?.packs.filter((p) => !p.isInDatabase) ?? []
  const packsNeedingUpdate = sourcePacks?.packs.filter((p) => p.needsUpdate) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Library Packs</h1>
          <p className="text-muted-foreground">
            Browse and install pre-built content packs for your organization.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSourcePacks(!showSourcePacks)}
          >
            <FolderSync className="mr-2 h-4 w-4" />
            {showSourcePacks ? 'Hide' : 'Show'} Source Packs
            {packsNotInDb.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {packsNotInDb.length} new
              </Badge>
            )}
          </Button>
          <Link to="/packs/installed">
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Installed ({installedCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* Sync Result Alert */}
      {syncResult && (
        <Alert variant={syncResult.success ? 'default' : 'destructive'}>
          {syncResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{syncResult.success ? 'Sync Complete' : 'Sync Failed'}</AlertTitle>
          <AlertDescription>{syncResult.message}</AlertDescription>
        </Alert>
      )}

      {/* Source Packs Section */}
      {showSourcePacks && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderSync className="h-5 w-5" />
                  Packs from Libraries Folder
                </CardTitle>
                <CardDescription>
                  These packs are available in the libraries/packs directory.
                  Sync them to make them available for installation.
                </CardDescription>
              </div>
              <Button
                onClick={handleSyncFromSource}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Import All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSource ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sourcePacks && sourcePacks.packs.length > 0 ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{sourcePacks.total} packs found</span>
                  <span>{sourcePacks.inDatabase} in database</span>
                  {packsNotInDb.length > 0 && (
                    <span className="text-orange-600">
                      {packsNotInDb.length} not imported
                    </span>
                  )}
                  {packsNeedingUpdate.length > 0 && (
                    <span className="text-blue-600">
                      {packsNeedingUpdate.length} need update
                    </span>
                  )}
                </div>

                {/* Pack List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sourcePacks.packs.map((pack) => (
                    <SourcePackCard
                      key={pack.slug}
                      pack={pack}
                      onImport={handleImportSingle}
                      onPreview={handlePreviewSourcePack}
                      isImporting={
                        importMutation.isPending &&
                        importMutation.variables?.slug === pack.slug
                      }
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No packs found in the libraries folder.
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            <div
              key={i}
              className="h-48 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : packs && packs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packs.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onInstall={handleInstall}
              onPreview={handlePreviewDatabasePack}
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

      {/* Install Dialog */}
      <InstallPackDialog
        pack={selectedPack}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* Preview Dialog */}
      <PreviewPackDialog
        packId={previewPackId}
        packSlug={previewPackSlug}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
      />
    </div>
  )
}

/**
 * Card component for displaying a pack from the source (libraries folder).
 */
function SourcePackCard({
  pack,
  onImport,
  onPreview,
  isImporting,
}: {
  pack: SourcePackInfo
  onImport: (slug: string) => void
  onPreview: (slug: string) => void
  isImporting: boolean
}) {
  const getStatusBadge = () => {
    if (pack.isInDatabase && !pack.needsUpdate) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          In Database
        </Badge>
      )
    }
    if (pack.needsUpdate) {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <RefreshCw className="mr-1 h-3 w-3" />
          Update Available
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-orange-600 border-orange-600">
        <AlertCircle className="mr-1 h-3 w-3" />
        Not Imported
      </Badge>
    )
  }

  const packTypeColors: Record<string, string> = {
    technology: 'bg-blue-100 text-blue-800',
    threat: 'bg-red-100 text-red-800',
    countermeasure: 'bg-green-100 text-green-800',
    compliance: 'bg-purple-100 text-purple-800',
    template: 'bg-yellow-100 text-yellow-800',
    full: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">{pack.name}</h4>
          <p className="text-sm text-muted-foreground">v{pack.version}</p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex flex-wrap gap-1">
        <Badge
          variant="secondary"
          className={packTypeColors[pack.packType] || 'bg-gray-100'}
        >
          {pack.packType}
        </Badge>
        <Badge variant="secondary">{pack.tier}</Badge>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">
        {pack.description || 'No description'}
      </p>

      <div className="flex gap-3 text-xs text-muted-foreground">
        {pack.componentCount > 0 && (
          <span>{pack.componentCount} components</span>
        )}
        {pack.threatCount > 0 && <span>{pack.threatCount} threats</span>}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPreview(pack.slug)}
          title="Preview pack contents"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {(!pack.isInDatabase || pack.needsUpdate) && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onImport(pack.slug)}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Download className="mr-2 h-3 w-3" />
            )}
            {pack.needsUpdate ? 'Update' : 'Import'}
          </Button>
        )}
      </div>
    </div>
  )
}
