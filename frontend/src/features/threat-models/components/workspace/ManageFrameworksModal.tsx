import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Framework } from '@/types'

interface ManageFrameworksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFrameworks: Array<{ id: number; name: string }>
  availableFrameworks: Framework[]
  onAdd: (frameworkId: number) => void
  onRemove: (frameworkId: number) => void
}

export function ManageFrameworksModal({
  open,
  onOpenChange,
  currentFrameworks,
  availableFrameworks,
  onAdd,
  onRemove,
}: ManageFrameworksModalProps) {
  const [search, setSearch] = useState('')

  const filteredAvailable = availableFrameworks.filter(
    (f) =>
      !currentFrameworks.find((c) => c.id === f.id) &&
      f.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Compliance Frameworks</DialogTitle>
          <DialogDescription>
            Add or remove compliance frameworks for this threat model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current frameworks */}
          <div>
            <h4 className="text-sm font-medium mb-2">Current Frameworks</h4>
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {currentFrameworks.length > 0 ? (
                  currentFrameworks.map((framework) => (
                    <div
                      key={framework.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div className="text-sm font-medium">{framework.name}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(framework.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No frameworks added
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add frameworks */}
          <div>
            <h4 className="text-sm font-medium mb-2">Add Frameworks</h4>
            <Input
              placeholder="Search frameworks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((framework) => (
                    <div
                      key={framework.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">{framework.name}</div>
                        {framework.version && (
                          <div className="text-xs text-muted-foreground">
                            v{framework.version}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(framework.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available frameworks
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
