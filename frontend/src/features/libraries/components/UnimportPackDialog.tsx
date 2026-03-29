import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function UnimportPackDialog({
  packName,
  open,
  onOpenChange,
  onConfirm,
}: {
  packName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unimport {packName}?</DialogTitle>
          <DialogDescription>
            This will remove all library items (components, threats, countermeasures) from this pack.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Existing threats and countermeasures in your diagrams will remain intact
              but will no longer be linked to library definitions.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            You can re-import this pack later from the catalog.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="mr-2 h-4 w-4" />
            Unimport
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
