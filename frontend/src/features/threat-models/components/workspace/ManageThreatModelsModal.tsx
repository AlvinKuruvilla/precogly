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
import type { ThreatModel } from '@/types'

interface ManageThreatModelsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectedModels: ThreatModel[]
  availableModels: ThreatModel[]
  currentModelId: string
  onAdd: (modelId: string) => void
  onRemove: (modelId: string) => void
}

export function ManageThreatModelsModal({
  open,
  onOpenChange,
  connectedModels,
  availableModels,
  currentModelId,
  onAdd,
  onRemove,
}: ManageThreatModelsModalProps) {
  const [search, setSearch] = useState('')

  const filteredAvailable = availableModels.filter(
    (m) =>
      m.id !== currentModelId &&
      !connectedModels.find((c) => c.id === m.id) &&
      m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Connected Threat Models</DialogTitle>
          <DialogDescription>
            Link related threat models to this one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connected models */}
          <div>
            <h4 className="text-sm font-medium mb-2">Connected Models</h4>
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {connectedModels.length > 0 ? (
                  connectedModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div className="text-sm font-medium">{model.name}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(model.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No models connected
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add models */}
          <div>
            <h4 className="text-sm font-medium mb-2">Add Models</h4>
            <Input
              placeholder="Search threat models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div className="text-sm font-medium">{model.name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(model.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available models
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
