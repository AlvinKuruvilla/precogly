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
import type { System } from '@/types'

interface ManageSystemsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectedSystems: System[]
  availableSystems: System[]
  onAdd: (systemId: string) => void
  onRemove: (systemId: string) => void
}

export function ManageSystemsModal({
  open,
  onOpenChange,
  connectedSystems,
  availableSystems,
  onAdd,
  onRemove,
}: ManageSystemsModalProps) {
  const [search, setSearch] = useState('')

  const filteredAvailable = availableSystems.filter(
    (s) =>
      !connectedSystems.find((c) => c.id === s.id) &&
      s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Connected Systems</DialogTitle>
          <DialogDescription>
            Add or remove systems connected to this threat model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connected systems */}
          <div>
            <h4 className="text-sm font-medium mb-2">Connected Systems</h4>
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {connectedSystems.length > 0 ? (
                  connectedSystems.map((system) => (
                    <div
                      key={system.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">{system.name}</div>
                        {system.owner && (
                          <div className="text-xs text-muted-foreground">
                            {system.owner}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(system.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No systems connected
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add systems */}
          <div>
            <h4 className="text-sm font-medium mb-2">Add Systems</h4>
            <Input
              placeholder="Search systems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((system) => (
                    <div
                      key={system.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">{system.name}</div>
                        {system.owner && (
                          <div className="text-xs text-muted-foreground">
                            {system.owner}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(system.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available systems
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
