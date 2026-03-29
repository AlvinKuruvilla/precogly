import { useState } from 'react'
import { Plus, Search, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useThreatLibrary, useCreateComponentThreat, useCreateFlowThreat } from '@/features/threat-models/api/threats'
const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

interface AddThreatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetId: number // Component ID or DataFlow ID
  targetType: 'component' | 'dataflow'
  targetName: string
  onSuccess?: () => void
}

export function AddThreatDialog({
  open,
  onOpenChange,
  targetId,
  targetType,
  targetName,
  onSuccess,
}: AddThreatDialogProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedThreatId, setSelectedThreatId] = useState<number | null>(null)
  const [selectedSeverity, setSelectedSeverity] = useState('medium')

  // Custom threat fields
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customSeverity, setCustomSeverity] = useState('medium')

  const { data: threatLibrary, isLoading } = useThreatLibrary()
  const createComponentThreat = useCreateComponentThreat()
  const createFlowThreat = useCreateFlowThreat()

  const filteredThreats = threatLibrary?.filter((threat) => {
    const query = searchQuery.toLowerCase()
    const taxonomyMatch = threat.taxonomyEntries?.some(
      (entry) => entry.title.toLowerCase().includes(query) || entry.externalId.toLowerCase().includes(query)
    ) ?? false
    return (
      threat.name?.toLowerCase().includes(query) ||
      threat.description?.toLowerCase().includes(query) ||
      taxonomyMatch
    )
  }) ?? []

  const selectedThreat = threatLibrary?.find((t) => t.id === selectedThreatId)

  const handleAddFromLibrary = () => {
    if (!selectedThreatId) return

    const onMutationSuccess = () => {
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    }

    if (targetType === 'component') {
      createComponentThreat.mutate(
        { component: targetId, threatLibrary: selectedThreatId, inherentSeverity: selectedSeverity },
        { onSuccess: onMutationSuccess }
      )
    } else {
      createFlowThreat.mutate(
        { dataFlow: targetId, threatLibrary: selectedThreatId, inherentSeverity: selectedSeverity },
        { onSuccess: onMutationSuccess }
      )
    }
  }

  const handleAddCustom = () => {
    if (!customName.trim()) return

    const baseData = {
      threatLibrary: null as null,
      threatName: customName,
      threatDescription: customDescription,
      inherentSeverity: customSeverity,
      status: 'exposed',
    }
    const onMutationSuccess = () => {
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    }

    if (targetType === 'component') {
      createComponentThreat.mutate(
        { component: targetId, ...baseData },
        { onSuccess: onMutationSuccess }
      )
    } else {
      createFlowThreat.mutate(
        { dataFlow: targetId, ...baseData },
        { onSuccess: onMutationSuccess }
      )
    }
  }

  const resetForm = () => {
    setSearchQuery('')
    setSelectedThreatId(null)
    setSelectedSeverity('medium')
    setCustomName('')
    setCustomDescription('')
    setCustomSeverity('medium')
    setActiveTab('library')
  }

  const isSubmitting = createComponentThreat.isPending || createFlowThreat.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Threat</DialogTitle>
          <DialogDescription>
            Add a threat to <span className="font-medium">{targetName}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'library' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">From Library</TabsTrigger>
            <TabsTrigger value="custom">Custom Threat</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search threats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] border rounded-md">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading threats...</div>
              ) : filteredThreats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? 'No threats match your search' : 'No threats available in library'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredThreats.map((threat) => (
                    <button
                      key={threat.id}
                      onClick={() => setSelectedThreatId(threat.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-md transition-colors',
                        selectedThreatId === threat.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{threat.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {threat.description}
                          </p>
                        </div>
                        {threat.taxonomyEntries && threat.taxonomyEntries.length > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted shrink-0">
                            {threat.taxonomyEntries.map((e) => e.title).join(', ')}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedThreat && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-md">
                <div>
                  <Label className="text-xs text-muted-foreground">Selected Threat</Label>
                  <p className="font-medium">{selectedThreat.name}</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="library-severity">Severity</Label>
                    <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                      <SelectTrigger id="library-severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-name">Threat Name *</Label>
              <Input
                id="custom-name"
                placeholder="Enter threat name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-description">Description</Label>
              <Textarea
                id="custom-description"
                placeholder="Describe the threat..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-severity">Severity *</Label>
              <Select value={customSeverity} onValueChange={setCustomSeverity}>
                <SelectTrigger id="custom-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <p>Custom threats are not linked to the threat library and won't auto-generate countermeasures.</p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === 'library' ? (
            <Button
              onClick={handleAddFromLibrary}
              disabled={!selectedThreatId || isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Threat
            </Button>
          ) : (
            <Button
              onClick={handleAddCustom}
              disabled={!customName.trim() || isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Threat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
