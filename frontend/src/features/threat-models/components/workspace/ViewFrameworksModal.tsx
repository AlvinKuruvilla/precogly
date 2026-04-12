import { Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ViewFrameworksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  frameworks: Array<{ id: number; name: string; version?: string }>
}

export function ViewFrameworksModal({
  open,
  onOpenChange,
  frameworks,
}: ViewFrameworksModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Frameworks
          </DialogTitle>
          <DialogDescription>
            Frameworks derived from countermeasure compliance mappings in this threat model.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2 py-2">
            {frameworks.length > 0 ? (
              frameworks.map((framework) => (
                <div
                  key={framework.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <div className="text-sm font-medium">{framework.name}</div>
                    {framework.version && (
                      <div className="text-xs text-muted-foreground">
                        v{framework.version}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No compliance frameworks yet. Frameworks appear here automatically as you map countermeasures to compliance requirements.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
