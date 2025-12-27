/**
 * Pack Browser page for browsing and installing library packs.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PackCard, InstallPackDialog } from '@/components/packs'
import { usePacks, useInstalledPacks } from '@/api/packs'
import type { LibraryPackListItem, PackFilters, PackType, PackTier } from '@/types/packs'

export function Packs() {
  const [filters, setFilters] = useState<PackFilters>({})
  const [searchInput, setSearchInput] = useState('')
  const [selectedPack, setSelectedPack] = useState<LibraryPackListItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: packs, isLoading } = usePacks(filters)
  const { data: installedPacks } = useInstalledPacks()

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

  const installedCount = installedPacks?.length ?? 0

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
        <Link to="/packs/installed">
          <Button variant="outline">
            <Package className="mr-2 h-4 w-4" />
            Installed ({installedCount})
          </Button>
        </Link>
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
            value={filters.pack_type ?? 'all'}
            onValueChange={(value) => handleFilterChange('pack_type', value)}
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
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No packs found</h3>
          <p className="text-muted-foreground">
            {filters.search || filters.pack_type || filters.tier
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
    </div>
  )
}
