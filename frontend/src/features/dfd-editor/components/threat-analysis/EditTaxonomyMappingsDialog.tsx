import { Tags } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TaxonomyEntry } from '@/types/domain'
import { ThreatTaxonomyEditor } from './ThreatTaxonomyEditor'

interface EditTaxonomyMappingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
  threatId: number
  threatName: string
  libraryTaxonomyEntries: TaxonomyEntry[]
}

/** The threat's categories, edited with the same picker as the threat detail panel. */
export function EditTaxonomyMappingsDialog({
  open,
  onOpenChange,
  threatModelId,
  threatId,
  threatName,
  libraryTaxonomyEntries,
}: EditTaxonomyMappingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Categories
          </DialogTitle>
          <DialogDescription>
            Categories of <span className="font-medium">{threatName}</span>. Changes are saved as you pick.
          </DialogDescription>
        </DialogHeader>
        <ThreatTaxonomyEditor
          threatModelId={threatModelId}
          threatId={threatId}
          libraryEntries={libraryTaxonomyEntries}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
