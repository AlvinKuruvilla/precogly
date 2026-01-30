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
import { useCreateAnalysisComponent, useComponentLibrary } from '@/api/components'

const COMPONENT_CATEGORIES = [
  { value: 'process', label: 'Process' },
  { value: 'datastore', label: 'Data Store' },
  { value: 'human_actor', label: 'Human Actor' },
  { value: 'system_actor', label: 'System Actor' },
]

interface AddCustomComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
  onSuccess?: () => void
}

export function AddCustomComponentDialog({
  open,
  onOpenChange,
  threatModelId,
  onSuccess,
}: AddCustomComponentDialogProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(null)

  // Custom component fields
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState('')

  // Fetch component library
  const { data: componentLibrary, isLoading } = useComponentLibrary()
  const createComponent = useCreateAnalysisComponent()

  const filteredLibrary = componentLibrary?.filter((cl) => {
    const query = searchQuery.toLowerCase()
    return (
      cl.name.toLowerCase().includes(query) ||
      cl.category.toLowerCase().includes(query) ||
      (cl.provider?.toLowerCase().includes(query) ?? false)
    )
  }) ?? []

  const selectedLibraryItem = componentLibrary?.find((cl) => cl.id === selectedLibraryId)

  const handleAddFromLibrary = () => {
    if (!selectedLibraryId || !selectedLibraryItem) return

    createComponent.mutate(
      {
        name: selectedLibraryItem.name,
        category: selectedLibraryItem.category,
        componentLibrary: selectedLibraryId,
        threatModel: parseInt(threatModelId, 10),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          resetForm()
          onSuccess?.()
        },
      }
    )
  }

  const handleAddCustom = () => {
    if (!customName.trim() || !customCategory) return

    createComponent.mutate(
      {
        name: customName,
        category: customCategory,
        componentLibrary: null,
        threatModel: parseInt(threatModelId, 10),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          resetForm()
          onSuccess?.()
        },
      }
    )
  }

  const resetForm = () => {
    setSearchQuery('')
    setSelectedLibraryId(null)
    setCustomName('')
    setCustomCategory('')
    setActiveTab('library')
  }

  const isSubmitting = createComponent.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Component for Analysis</DialogTitle>
          <DialogDescription>
            Add a component that exists outside the DFD canvas for threat analysis.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'library' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">From Library</TabsTrigger>
            <TabsTrigger value="custom">Custom Component</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] border rounded-md">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading components...</div>
              ) : filteredLibrary.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? 'No components match your search' : 'No components available in library'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredLibrary.map((cl) => (
                    <button
                      key={cl.id}
                      onClick={() => setSelectedLibraryId(cl.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-md transition-colors',
                        selectedLibraryId === cl.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{cl.name}</p>
                          {cl.provider && (
                            <p className="text-sm text-muted-foreground">
                              {cl.provider}
                            </p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted shrink-0 capitalize">
                          {cl.category.replace('_', ' ')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedLibraryItem && (
              <div className="p-3 bg-muted/50 rounded-md">
                <Label className="text-xs text-muted-foreground">Selected Component</Label>
                <p className="font-medium">{selectedLibraryItem.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  Category: {selectedLibraryItem.category.replace('_', ' ')}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-component-name">Component Name *</Label>
              <Input
                id="custom-component-name"
                placeholder="Enter component name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-component-category">Category *</Label>
              <Select value={customCategory} onValueChange={setCustomCategory}>
                <SelectTrigger id="custom-component-category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <p>
                Custom components are for analysis only and won't appear on the DFD canvas.
                Threats can be added manually after creation.
              </p>
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
              disabled={!selectedLibraryId || isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          ) : (
            <Button
              onClick={handleAddCustom}
              disabled={!customName.trim() || !customCategory || isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Component
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
