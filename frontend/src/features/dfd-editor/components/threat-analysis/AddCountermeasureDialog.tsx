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
import {
  useCountermeasureLibrary,
  useCreateComponentCountermeasure,
  useCreateFlowCountermeasure,
} from '@/features/threat-models/api/threats'

const CONTROL_TYPES = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'detective', label: 'Detective' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'deterrent', label: 'Deterrent' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'compensating', label: 'Compensating' },
]

interface AddCountermeasureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatId: number // Backend threat instance ID
  threatType: 'component' | 'dataflow'
  threatName: string
  threatLibraryId?: number | null // For filtering applicable countermeasures
  onSuccess?: () => void
}

export function AddCountermeasureDialog({
  open,
  onOpenChange,
  threatId,
  threatType,
  threatName,
  threatLibraryId,
  onSuccess,
}: AddCountermeasureDialogProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountermeasureId, setSelectedCountermeasureId] = useState<number | null>(null)

  // Custom countermeasure fields
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customControlType, setCustomControlType] = useState('')

  // Fetch countermeasures - filter by applicable threats if we have a library threat
  const { data: countermeasureLibrary, isLoading } = useCountermeasureLibrary(threatLibraryId)
  const createComponentCountermeasure = useCreateComponentCountermeasure()
  const createFlowCountermeasure = useCreateFlowCountermeasure()

  const filteredCountermeasures = countermeasureLibrary?.filter((cm) => {
    const query = searchQuery.toLowerCase()
    return (
      cm.name.toLowerCase().includes(query) ||
      (cm.description?.toLowerCase().includes(query) ?? false) ||
      cm.controlType.toLowerCase().includes(query)
    )
  }) ?? []

  const selectedCountermeasure = countermeasureLibrary?.find((cm) => cm.id === selectedCountermeasureId)

  const handleAddFromLibrary = () => {
    if (!selectedCountermeasureId) return

    const countermeasureDefaultStatus = selectedCountermeasure?.defaultStatus ?? 'gap'
    const onMutationSuccess = () => {
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    }

    if (threatType === 'component') {
      createComponentCountermeasure.mutate(
        { instanceThreat: threatId, countermeasureLibrary: selectedCountermeasureId, status: countermeasureDefaultStatus },
        { onSuccess: onMutationSuccess }
      )
    } else {
      createFlowCountermeasure.mutate(
        { flowThreat: threatId, countermeasureLibrary: selectedCountermeasureId, status: countermeasureDefaultStatus },
        { onSuccess: onMutationSuccess }
      )
    }
  }

  const handleAddCustom = () => {
    if (!customName.trim()) return

    const baseData = {
      countermeasureLibrary: null as null,
      countermeasureName: customName,
      countermeasureDescription: customDescription,
      controlType: customControlType || undefined,
      status: 'gap',
    }
    const onMutationSuccess = () => {
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    }

    if (threatType === 'component') {
      createComponentCountermeasure.mutate(
        { instanceThreat: threatId, ...baseData },
        { onSuccess: onMutationSuccess }
      )
    } else {
      createFlowCountermeasure.mutate(
        { flowThreat: threatId, ...baseData },
        { onSuccess: onMutationSuccess }
      )
    }
  }

  const resetForm = () => {
    setSearchQuery('')
    setSelectedCountermeasureId(null)
    setCustomName('')
    setCustomDescription('')
    setCustomControlType('')
    setActiveTab('library')
  }

  const isSubmitting = createComponentCountermeasure.isPending || createFlowCountermeasure.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Countermeasure</DialogTitle>
          <DialogDescription>
            Add a countermeasure for threat: <span className="font-medium">{threatName}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'library' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">From Library</TabsTrigger>
            <TabsTrigger value="custom">Custom Countermeasure</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search countermeasures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {threatLibraryId != null && !Number.isNaN(threatLibraryId) && (
              <p className="text-xs text-muted-foreground">
                Showing countermeasures applicable to this threat type. Clear search to see all.
              </p>
            )}

            <ScrollArea className="h-[300px] border rounded-md">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading countermeasures...</div>
              ) : filteredCountermeasures.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? 'No countermeasures match your search' : 'No countermeasures available in library'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCountermeasures.map((cm) => (
                    <button
                      key={cm.id}
                      onClick={() => setSelectedCountermeasureId(cm.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-md transition-colors',
                        selectedCountermeasureId === cm.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{cm.name}</p>
                          {cm.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {cm.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted shrink-0 capitalize">
                          {cm.controlType}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedCountermeasure && (
              <div className="p-3 bg-muted/50 rounded-md">
                <Label className="text-xs text-muted-foreground">Selected Countermeasure</Label>
                <p className="font-medium">{selectedCountermeasure.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  Control Type: {selectedCountermeasure.controlType}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-cm-name">Countermeasure Name *</Label>
              <Input
                id="custom-cm-name"
                placeholder="Enter countermeasure name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-cm-description">Description</Label>
              <Textarea
                id="custom-cm-description"
                placeholder="Describe the countermeasure..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-cm-control-type">Control Type</Label>
              <Select value={customControlType} onValueChange={setCustomControlType}>
                <SelectTrigger id="custom-cm-control-type">
                  <SelectValue placeholder="Select control type..." />
                </SelectTrigger>
                <SelectContent>
                  {CONTROL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <p>Custom countermeasures are not linked to the library and won't have compliance mappings by default.</p>
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
              disabled={!selectedCountermeasureId || isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Countermeasure
            </Button>
          ) : (
            <Button
              onClick={handleAddCustom}
              disabled={!customName.trim() || isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Countermeasure
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
