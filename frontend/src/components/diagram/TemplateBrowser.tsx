import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, LayoutTemplate, Plus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DiagramTemplate, DiagramNode, DataFlowEdge } from '@/types'

interface TemplateBrowserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (nodes: DiagramNode[], edges: DataFlowEdge[]) => void
}

async function fetchTemplates(): Promise<DiagramTemplate[]> {
  const response = await fetch('/api/templates')
  if (!response.ok) {
    throw new Error('Failed to fetch templates')
  }
  return response.json()
}

export function TemplateBrowser({
  open,
  onOpenChange,
  onInsert,
}: TemplateBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<DiagramTemplate | null>(null)

  const {
    data: templates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
    enabled: open,
  })

  // Filter templates by search query
  const filteredTemplates = templates?.filter((template) => {
    const query = searchQuery.toLowerCase()
    return (
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      template.tags.some((tag) => tag.toLowerCase().includes(query))
    )
  })

  const handleInsert = () => {
    if (!selectedTemplate) return

    const nodes = selectedTemplate.canvasData.nodes as DiagramNode[]
    const edges = selectedTemplate.canvasData.edges as DataFlowEdge[]

    onInsert(nodes, edges)
    setSelectedTemplate(null)
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            DFD Templates
          </DialogTitle>
          <DialogDescription>
            Browse and insert pre-built diagram templates to accelerate your threat modeling
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Content */}
          <div className="flex gap-4 min-h-[400px]">
            {/* Template list */}
            <ScrollArea className="flex-1 border rounded-lg">
              {isLoading && (
                <div className="flex items-center justify-center h-full p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {isError && (
                <div className="flex items-center justify-center h-full p-8 text-muted-foreground">
                  Failed to load templates
                </div>
              )}

              {!isLoading && !isError && filteredTemplates?.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                  <LayoutTemplate className="h-12 w-12 mb-2 opacity-50" />
                  <p>No templates found</p>
                </div>
              )}

              {!isLoading && !isError && filteredTemplates && (
                <div className="p-2 space-y-2">
                  {filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:bg-muted'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                        </div>
                        {template.isPublic && (
                          <Badge variant="secondary" className="shrink-0">
                            Public
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {template.canvasData.nodes.length} nodes •{' '}
                        {template.canvasData.edges.length} connections
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Preview panel */}
            <div className="w-80 border rounded-lg p-4 flex flex-col">
              {selectedTemplate ? (
                <>
                  <h3 className="font-semibold mb-2">{selectedTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedTemplate.description}
                  </p>

                  <div className="flex-1 bg-muted/30 rounded-lg p-4 mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                      Components
                    </h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(
                        selectedTemplate.canvasData.nodes.reduce(
                          (acc, node) => {
                            const type = (node as DiagramNode).type || 'unknown'
                            acc[type] = (acc[type] || 0) + 1
                            return acc
                          },
                          {} as Record<string, number>
                        )
                      ).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t mt-2">
                        <span>Data Flows</span>
                        <span className="text-muted-foreground">
                          {selectedTemplate.canvasData.edges.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleInsert} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Insert Template
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <LayoutTemplate className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm text-center">
                    Select a template to preview its components
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
