/**
 * Dialog for confirming pack import with dependency information.
 */

import { AlertCircle, Check, Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePackDependencies, useImportSinglePack } from '@/api/packs'
import type { LibraryPackListItem } from '@/types/packs'

interface ImportPackDialogProps {
  pack: LibraryPackListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function InstallPackDialog({
  pack,
  open,
  onOpenChange,
  onSuccess,
}: ImportPackDialogProps) {
  const { data: depCheck, isLoading: loadingDeps } = usePackDependencies(
    pack?.id ?? null
  )
  const importMutation = useImportSinglePack()

  const hasMissingDeps = depCheck && depCheck.missingDependencies.length > 0

  const handleImport = async () => {
    if (!pack) return

    try {
      await importMutation.mutateAsync({
        slug: pack.slug,
        force: false,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to import pack:', error)
    }
  }

  if (!pack) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Import {pack.name}
          </DialogTitle>
          <DialogDescription>
            {pack.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">{pack.version}</span>
          </div>

          {/* Dependencies section */}
          {loadingDeps ? (
            <div className="text-sm text-muted-foreground">
              Checking dependencies...
            </div>
          ) : depCheck && depCheck.dependencies.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Dependencies</h4>
              <div className="space-y-1">
                {depCheck.dependencies.map((dep) => (
                  <div
                    key={dep.packId}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
                  >
                    <span>{dep.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {dep.version}
                      </span>
                      {dep.isImported ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Will import
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {hasMissingDeps && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  Missing dependencies will be imported automatically.
                </p>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No dependencies required.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importMutation.isPending || loadingDeps}
          >
            {importMutation.isPending ? 'Importing...' : 'Import Pack'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
