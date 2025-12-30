import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { System, ThreatModel, Diagram } from '@/types'
import type { TeamMember } from '@/features/dfd-editor/types/threat-analysis'

// ============================================
// Manage Connected Systems Modal
// ============================================

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
                        {system.description && (
                          <div className="text-xs text-muted-foreground">
                            {system.description}
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
                        {system.description && (
                          <div className="text-xs text-muted-foreground">
                            {system.description}
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

// ============================================
// Manage Connected Threat Models Modal
// ============================================

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

// ============================================
// Manage People Modal
// ============================================

interface ManagePeopleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  people: TeamMember[]
  availablePeople: TeamMember[]
  onAdd: (personId: string) => void
  onRemove: (personId: string) => void
}

export function ManagePeopleModal({
  open,
  onOpenChange,
  people,
  availablePeople,
  onAdd,
  onRemove,
}: ManagePeopleModalProps) {
  const [search, setSearch] = useState('')

  const filteredAvailable = availablePeople.filter(
    (p) =>
      !people.find((c) => c.id === p.id) &&
      (`${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage People</DialogTitle>
          <DialogDescription>
            Add or remove team members from this threat model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Assigned people */}
          <div>
            <h4 className="text-sm font-medium mb-2">Assigned Team Members</h4>
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {people.length > 0 ? (
                  people.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {person.firstName} {person.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {person.email}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(person.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No team members assigned
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add people */}
          <div>
            <h4 className="text-sm font-medium mb-2">Add Team Members</h4>
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {person.firstName} {person.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {person.email}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(person.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available team members
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

// ============================================
// Manage DFDs Modal
// ============================================

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
                      <div className="text-sm font-medium truncate">
                        {dfd.name}
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
