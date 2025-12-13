import { memo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { User, Cog, Database, Shield, Box, ArrowRight, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { DiagramNodeType } from '@/types'

interface DiagramToolbarProps {
  connectionMode: boolean
  onConnectionModeChange: (enabled: boolean) => void
  onOpenTemplates: () => void
}

interface ToolbarButtonConfig {
  type: DiagramNodeType
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
}

const nodeButtons: ToolbarButtonConfig[] = [
  {
    type: 'actor',
    label: 'Actor',
    icon: User,
    color: 'text-green-600 hover:bg-green-50',
    description: 'External user or system that interacts with your application',
  },
  {
    type: 'process',
    label: 'Process',
    icon: Cog,
    color: 'text-blue-600 hover:bg-blue-50',
    description: 'A process, service, or API that handles data',
  },
  {
    type: 'datastore',
    label: 'Data Store',
    icon: Database,
    color: 'text-purple-600 hover:bg-purple-50',
    description: 'Database, file system, or cache that stores data',
  },
  {
    type: 'trustBoundary',
    label: 'Trust Boundary',
    icon: Shield,
    color: 'text-orange-600 hover:bg-orange-50',
    description: 'Security boundary with specific trust level (e.g., DMZ, VPC)',
  },
  {
    type: 'systemBoundary',
    label: 'System Boundary',
    icon: Box,
    color: 'text-slate-600 hover:bg-slate-50',
    description: 'Visual grouping for related components (no security semantics)',
  },
]

export const DiagramToolbar = memo(function DiagramToolbar({
  connectionMode,
  onConnectionModeChange,
  onOpenTemplates,
}: DiagramToolbarProps) {
  const { addNodes, getNodes, screenToFlowPosition } = useReactFlow()

  const handleAddNode = (type: DiagramNodeType) => {
    const nodes = getNodes()

    // Calculate position for new node (offset from existing nodes)
    const baseX = 100 + (nodes.length % 5) * 150
    const baseY = 100 + Math.floor(nodes.length / 5) * 150

    // Generate unique ID
    const id = `${type}-${Date.now()}`

    // Default data based on node type
    const defaultData: Record<DiagramNodeType, Record<string, unknown>> = {
      actor: { label: 'New Actor' },
      process: { label: 'New Process', technology: '' },
      datastore: { label: 'New Data Store', technology: '' },
      trustBoundary: { label: 'Trust Boundary', trustLevel: 'internal' },
      systemBoundary: { label: 'System Boundary' },
    }

    // Default style for boundary nodes
    const defaultStyle = (type === 'trustBoundary' || type === 'systemBoundary')
      ? { width: 300, height: 200 }
      : undefined

    addNodes({
      id,
      type,
      position: { x: baseX, y: baseY },
      data: { ...defaultData[type], isNewlyInserted: true },
      style: defaultStyle,
    })

    // Remove the "newly inserted" highlight after 2 seconds
    setTimeout(() => {
      const currentNodes = getNodes()
      const nodeIndex = currentNodes.findIndex((n) => n.id === id)
      if (nodeIndex !== -1) {
        const updatedNodes = [...currentNodes]
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          data: { ...updatedNodes[nodeIndex].data, isNewlyInserted: false },
        }
      }
    }, 2000)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 p-2 bg-background border-b">
        {/* Node buttons */}
        {nodeButtons.map((button) => (
          <Tooltip key={button.type}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn('gap-2', button.color)}
                onClick={() => handleAddNode(button.type)}
              >
                <button.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{button.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="font-medium">{button.label}</p>
              <p className="text-xs text-muted-foreground">{button.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="h-8 mx-2" />

        {/* Connection mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={connectionMode ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => onConnectionModeChange(!connectionMode)}
            >
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">Draw Connection</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">Draw Connection</p>
            <p className="text-xs text-muted-foreground">
              Click and drag from one node to another to create a data flow
            </p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-8 mx-2" />

        {/* Templates button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onOpenTemplates}
            >
              <LayoutTemplate className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">DFD Templates</p>
            <p className="text-xs text-muted-foreground">
              Browse and insert pre-built diagram templates
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
})
