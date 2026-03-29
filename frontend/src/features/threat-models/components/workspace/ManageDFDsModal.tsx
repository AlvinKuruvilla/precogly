import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Diagram } from '@/types'

interface ManageDFDsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
  dfds: Diagram[]
  onCreateDFD: () => void
  onDeleteDFD: (diagramId: string) => void
}

export function ManageDFDsModal({
  open,
  onOpenChange,
  threatModelId,
  dfds,
  onCreateDFD,
  onDeleteDFD,
}: ManageDFDsModalProps) {
  const navigate = useNavigate()

  const handleEditDFD = (diagramId: string) => {
    onOpenChange(false)
    navigate(`/threat-models/${threatModelId}/diagrams/${diagramId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage DFDs</DialogTitle>
          <DialogDescription>
            Create, edit, or delete data flow diagrams for this threat model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* DFD list */}
          <ScrollArea className="h-[300px] border rounded-md">
            <div className="p-2 space-y-1">
              {dfds.length > 0 ? (
                dfds.map((dfd) => (
                  <div
                    key={dfd.id}
                    className="flex items-center justify-between p-3 hover:bg-muted rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {dfd.name}
                        {dfd.isPrimary ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Primary
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 ring-1 ring-inset ring-gray-500/10"
                            title="Components not synced to threat analysis"
                          >
                            Reference
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dfd.canvasData?.nodes?.length || 0} nodes &bull;{' '}
                        {dfd.canvasData?.edges?.length || 0} connections
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditDFD(dfd.id)}
                        title="Edit DFD"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditDFD(dfd.id)}
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteDFD(dfd.id)}
                        title="Delete DFD"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No DFDs created yet
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Create new DFD */}
          <Button onClick={onCreateDFD} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Create New DFD
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
