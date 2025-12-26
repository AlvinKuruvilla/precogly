import { ChevronLeft, ChevronRight, LayoutGrid, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Diagram } from '@/types'

interface DFDCarouselProps {
  diagrams: Diagram[]
  selectedDiagramId: string | null // null means "All DFDs"
  onSelectDiagram: (diagramId: string | null) => void
  onEditDiagram: (diagramId: string) => void
  onCreateDiagram: () => void
  isCreating?: boolean
}

export function DFDCarousel({
  diagrams,
  selectedDiagramId,
  onSelectDiagram,
  onEditDiagram,
  onCreateDiagram,
  isCreating = false,
}: DFDCarouselProps) {
  if (diagrams.length === 0) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 bg-muted/30 rounded-lg">
      {/* Left side: Carousel */}
      <div className="flex items-center gap-2 flex-1 overflow-hidden">
        {/* Scroll left button - for future implementation */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          disabled
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* All DFDs option */}
        <button
          onClick={() => onSelectDiagram(null)}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors min-w-[100px]',
            selectedDiagramId === null
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
        >
          <div
            className={cn(
              'w-16 h-12 rounded border flex items-center justify-center',
              selectedDiagramId === null
                ? 'bg-primary-foreground/20 border-primary-foreground/30'
                : 'bg-background border-border'
            )}
          >
            <LayoutGrid className="h-5 w-5 opacity-50" />
          </div>
          <span className="text-xs font-medium">All DFDs</span>
        </button>

        {/* DFD thumbnails */}
        <div className="flex gap-2 overflow-x-auto">
          {diagrams.map((diagram) => {
            const isSelected = selectedDiagramId === diagram.id
            const nodeCount = diagram.canvasData?.nodes?.length || 0

            return (
              <div
                key={diagram.id}
                className={cn(
                  'group relative flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors min-w-[100px]',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {/* Click to filter */}
                <button
                  onClick={() => onSelectDiagram(diagram.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={cn(
                      'w-16 h-12 rounded border flex items-center justify-center text-xs relative',
                      isSelected
                        ? 'bg-primary-foreground/20 border-primary-foreground/30'
                        : 'bg-background border-border'
                    )}
                  >
                    <div className="text-center">
                      <div className="font-medium">{nodeCount}</div>
                      <div className="text-[10px] opacity-70">
                        {nodeCount === 1 ? 'node' : 'nodes'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium truncate max-w-[90px]">
                    {diagram.title}
                  </span>
                </button>

                {/* Edit button - appears on hover */}
                <Button
                  variant="secondary"
                  size="icon"
                  className={cn(
                    'absolute -top-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md',
                    isSelected && 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditDiagram(diagram.id)
                  }}
                  title="Edit DFD"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
        </div>

        {/* Scroll right button - for future implementation */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          disabled
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right side: New DFD button */}
      <Button
        onClick={onCreateDiagram}
        disabled={isCreating}
        className="gap-2 flex-shrink-0"
      >
        <Plus className="h-4 w-4" />
        {isCreating ? 'Creating...' : 'New DFD'}
      </Button>
    </div>
  )
}
