import { useState } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

interface ConnectedPack {
  id: number
  name: string
  slug: string
  version: string
  packType: string
}

interface AvailablePack {
  id: number
  name: string
  slug: string
  version: string
  packType: string
}

interface DependencyWarning {
  pack: string
  message: string
}

interface ManagePacksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectedPacks: ConnectedPack[]
  availablePacks: AvailablePack[]
  onRemove: (packId: number) => Promise<DependencyWarning[]>
  onAdd: (packId: number) => void
}

export function ManagePacksModal({
  open,
  onOpenChange,
  connectedPacks,
  availablePacks,
  onRemove,
  onAdd,
}: ManagePacksModalProps) {
  const [search, setSearch] = useState('')
  const [dependencyWarnings, setDependencyWarnings] = useState<DependencyWarning[]>([])

  const disconnectedPacks = availablePacks.filter(
    (p) =>
      !connectedPacks.some((c) => c.id === p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleRemove = async (packId: number) => {
    const warnings = await onRemove(packId)
    if (warnings.length > 0) {
      setDependencyWarnings(warnings)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDependencyWarnings([])
      setSearch('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Connected Packs</DialogTitle>
          <DialogDescription>
            Add or remove packs for this threat model. Existing instances
            from removed packs will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dependency warnings */}
          {dependencyWarnings.length > 0 && (
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                Dependency info
              </AlertTitle>
              <AlertDescription>
                <ul className="mt-1 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                  {dependencyWarnings.map((warning, idx) => (
                    <li key={idx}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Connected packs */}
          <div>
            <h4 className="text-sm font-medium mb-2">Connected Packs</h4>
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {connectedPacks.length > 0 ? (
                  connectedPacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">{pack.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="secondary" className="text-xs">
                            v{pack.version}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {pack.packType}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(pack.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No packs connected
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add packs */}
          <div>
            <h4 className="text-sm font-medium mb-2">Add Packs</h4>
            <Input
              placeholder="Search packs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {disconnectedPacks.length > 0 ? (
                  disconnectedPacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">{pack.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="secondary" className="text-xs">
                            v{pack.version}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {pack.packType}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(pack.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {search ? 'No matching packs' : 'All packs are connected'}
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
