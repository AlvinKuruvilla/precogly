import { useState } from 'react'
import { AlertTriangle, Loader2, Trash2, Box, Info } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useDFDDeletePreview } from '@/features/threat-models/api/threat-models'

interface DeleteDFDDialogProps {
  dfdId: string | null
  dfdName: string
  isPrimary?: boolean
  remainingDfdCount?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (deleteOrphanedComponents: boolean) => void
  isDeleting?: boolean
}

export function DeleteDFDDialog({
  dfdId,
  dfdName,
  isPrimary = false,
  remainingDfdCount = 0,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: DeleteDFDDialogProps) {
  const [deleteOrphanedComponents, setDeleteOrphanedComponents] = useState(false)

  const { data: preview, isLoading: isLoadingPreview } = useDFDDeletePreview(
    open && dfdId ? dfdId : null
  )

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset checkbox when dialog closes
      setDeleteOrphanedComponents(false)
    }
    onOpenChange(newOpen)
  }

  if (!dfdId) return null

  const affectedThreatModels = preview?.affectedThreatModels ?? []
  const orphanedComponents = preview?.orphanedComponents ?? []
  const hasOrphanedComponents = orphanedComponents.length > 0

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle>Delete Data Flow Diagram</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Are you sure you want to delete <strong>"{dfdName}"</strong>? This action cannot be undone.
          </AlertDialogDescription>

          {isLoadingPreview ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading preview...</span>
            </div>
          ) : preview ? (
            <div className="mt-3 space-y-3">
              {/* DFD Info */}
              <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                <div className="text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Nodes:</span>
                    <span className="font-medium">{preview.dfd.nodeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Components:</span>
                    <span className="font-medium">{preview.dfd.componentCount}</span>
                  </div>
                </div>
              </div>

              {/* Primary DFD promotion notice */}
              {isPrimary && remainingDfdCount > 0 && (
                <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    This is the primary DFD. Another DFD will be automatically promoted to primary.
                  </div>
                </div>
              )}

              {/* Affected threat model */}
              {affectedThreatModels.length > 0 && (
                <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                  <p className="text-sm text-blue-700">
                    This DFD will be removed from: <strong>{affectedThreatModels[0].name}</strong>
                  </p>
                </div>
              )}

              {/* Orphaned components */}
              {hasOrphanedComponents && (
                <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-800 mb-2">
                    <Box className="h-4 w-4" />
                    Orphaned Components ({orphanedComponents.length})
                  </div>
                  <p className="text-sm text-orange-700 mb-2">
                    These components are only used in this DFD and will become orphaned:
                  </p>
                  <ul className="space-y-1 mb-3">
                    {orphanedComponents.slice(0, 5).map((comp) => (
                      <li key={comp.id} className="text-sm text-orange-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        {comp.name}
                        {comp.libraryName && (
                          <span className="text-xs text-orange-500">({comp.libraryName})</span>
                        )}
                      </li>
                    ))}
                    {orphanedComponents.length > 5 && (
                      <li className="text-sm text-orange-600 italic">
                        ... and {orphanedComponents.length - 5} more
                      </li>
                    )}
                  </ul>

                  {/* Checkbox to delete orphaned components */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-orange-200">
                    <Checkbox
                      id="delete-orphaned"
                      checked={deleteOrphanedComponents}
                      onCheckedChange={(checked) => setDeleteOrphanedComponents(checked === true)}
                    />
                    <Label
                      htmlFor="delete-orphaned"
                      className="text-sm text-orange-800 cursor-pointer"
                    >
                      Also delete orphaned components and their threats
                    </Label>
                  </div>
                </div>
              )}

              {/* What will be deleted */}
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Trash2 className="h-4 w-4" />
                  Will be deleted:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-red-700 text-xs">
                  <li>The DFD diagram and all its nodes/edges</li>
                  <li>Association with the threat model</li>
                  {deleteOrphanedComponents && hasOrphanedComponents && (
                    <li className="font-medium">
                      {orphanedComponents.length} orphaned component(s) and their threats
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm(deleteOrphanedComponents)
            }}
            disabled={isDeleting || isLoadingPreview}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete DFD'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
