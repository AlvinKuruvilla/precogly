import { useState, useMemo } from 'react'
import { Package, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePacks, useUnimportPack } from '@/features/libraries/api/packs'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { ImportedPackRow } from './ImportedPackRow'
import { UnimportPackDialog } from './UnimportPackDialog'

export function ImportedView() {
  const { isSecurityTeam } = useWorkspace()
  const { data: dbPacks, isLoading } = usePacks({})
  const [expandedPacks, setExpandedPacks] = useState<Set<number>>(new Set())
  const [unimportDialogPack, setUnimportDialogPack] = useState<{
    id: number
    name: string
    slug: string
  } | null>(null)
  const [unimportingId, setUnimportingId] = useState<number | null>(null)
  const [unimportError, setUnimportError] = useState<string | null>(null)

  const unimportMutation = useUnimportPack()

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

  const handleUnimportClick = (pack: { id: number; name: string; slug: string }) => {
    setUnimportError(null)
    setUnimportDialogPack(pack)
  }

  const handleUnimportConfirm = async () => {
    if (!unimportDialogPack) return
    setUnimportingId(unimportDialogPack.id)
    setUnimportDialogPack(null)
    setUnimportError(null)
    try {
      await unimportMutation.mutateAsync({ packId: unimportDialogPack.id })
    } catch (error: unknown) {
      // ApiError stores response body in error.data (not error.response.data)
      const errorData = (error as { data?: { error?: string; dependentPacks?: string[] } })?.data as
        | { error?: string; dependentPacks?: string[] }
        | undefined
      if (errorData?.dependentPacks) {
        setUnimportError(`Cannot unimport: other packs depend on this one (${errorData.dependentPacks.join(', ')})`)
      } else if (errorData?.error) {
        setUnimportError(errorData.error)
      } else {
        setUnimportError('Failed to unimport pack')
      }
    } finally {
      setUnimportingId(null)
    }
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
      {/* Error banner */}
      {unimportError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{unimportError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-destructive hover:text-destructive"
            onClick={() => setUnimportError(null)}
          >
            ×
          </Button>
        </div>
      )}

      {importedPacks.map((pack) => (
        <ImportedPackRow
          key={pack.id}
          pack={pack}
          isExpanded={expandedPacks.has(pack.id)}
          onToggleExpand={() => toggleExpanded(pack.id)}
          onUnimport={() => handleUnimportClick({ id: pack.id, name: pack.name, slug: pack.slug })}
          isUnimporting={unimportingId === pack.id}
          isSecurityTeam={isSecurityTeam}
        />
      ))}

      <UnimportPackDialog
        packName={unimportDialogPack?.name ?? null}
        open={unimportDialogPack !== null}
        onOpenChange={(open) => !open && setUnimportDialogPack(null)}
        onConfirm={handleUnimportConfirm}
      />
    </div>
  )
}
