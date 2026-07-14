import { memo } from 'react'
import { useReactFlow, type XYPosition } from '@xyflow/react'
import { User, Server, Cog, Database, Shield, Box, ArrowRight, LayoutTemplate, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { DiagramNodeType } from '../types'
import { type DFDNotationStyle, NOTATION_NODE_SIZES } from '../types/notation'

interface DiagramToolbarProps {
  connectionMode: boolean
  onConnectionModeChange: (enabled: boolean) => void
  boundaryMode: boolean
  onBoundaryModeChange: (enabled: boolean) => void
  getCanvasCenterPosition: () => XYPosition
  onOpenTemplates: () => void
  onOpenThreatAnalysis: () => void
  hideTemplates?: boolean
  hideAnalyzeThreats?: boolean
  notationStyle?: DFDNotationStyle
  onNotationChange?: (notation: DFDNotationStyle) => void
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
    type: 'humanActor',
    label: 'Human Actor',
    icon: User,
    color: 'text-green-600 hover:bg-green-50',
    description: 'External human user: customer, admin, attacker',
  },
  {
    type: 'systemActor',
    label: 'System Actor',
    icon: Server,
    color: 'text-slate-600 hover:bg-slate-50',
    description: 'External system: third-party API, partner system',
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
    type: 'trustZone',
    label: 'Trust Zone',
    icon: Shield,
    color: 'text-orange-600 hover:bg-orange-50',
    description: 'Security zone with specific trust level (e.g., DMZ, VPC)',
  },
  {
    type: 'systemScope',
    label: 'System Scope',
    icon: Box,
    color: 'text-gray-600 hover:bg-gray-50',
    description: 'Visual grouping for related components (defines analysis scope)',
  },
]

export const DiagramToolbar = memo(function DiagramToolbar({
  connectionMode,
  onConnectionModeChange,
  boundaryMode,
  onBoundaryModeChange,
  getCanvasCenterPosition,
  onOpenTemplates,
  onOpenThreatAnalysis,
  hideTemplates,
  hideAnalyzeThreats,
  notationStyle = 'dfd3',
  onNotationChange,
}: DiagramToolbarProps) {
  const { addNodes, getNodes } = useReactFlow()
  const nodeSizes = NOTATION_NODE_SIZES[notationStyle]

  const handleAddNode = (type: DiagramNodeType) => {
    const center = getCanvasCenterPosition()
    const nodeSize = nodeSizes[type] ?? { width: 120, height: 70 }
    const position = {
      x: center.x - nodeSize.width / 2,
      y: center.y - nodeSize.height / 2,
    }

    // Generate unique ID
    const id = `${type}-${Date.now()}`

    // Default data based on node type
    const defaultData: Record<DiagramNodeType, Record<string, unknown>> = {
      humanActor: { label: 'New Human Actor' },
      systemActor: { label: 'New System Actor' },
      process: { label: 'New Process', technology: '' },
      datastore: { label: 'New Data Store', technology: '' },
      trustZone: { label: 'Trust Zone', trustLevel: 75, zoneColor: '#22c55e' },
      systemScope: { label: 'System Scope' },
    }

    addNodes({
      id,
      type,
      position,
      data: { ...defaultData[type], isNewlyInserted: true },
      style: { width: nodeSize.width, height: nodeSize.height },
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
              <span className="hidden sm:inline">Flow</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">Draw Connection</p>
            <p className="text-xs text-muted-foreground">
              Click and drag from one node to another to create a data flow
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Trust Boundary mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={boundaryMode ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => onBoundaryModeChange(!boundaryMode)}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Trust Boundary</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">Trust Boundary</p>
            <p className="text-xs text-muted-foreground">
              Click two trust zones to create a security boundary between them
            </p>
          </TooltipContent>
        </Tooltip>

        {onNotationChange && (
          <>
            <Separator orientation="vertical" className="h-8 mx-2" />
            <Select
              value={notationStyle}
              onValueChange={(value) => onNotationChange(value as DFDNotationStyle)}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dfd3">DFD3</SelectItem>
                <SelectItem value="yourdon">Yourdon</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {!hideTemplates && (
          <>
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
          </>
        )}

        {!hideAnalyzeThreats && (
          <>
            <Separator orientation="vertical" className="h-8 mx-2" />

            {/* Threat Analysis button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={onOpenThreatAnalysis}
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span className="hidden sm:inline">Analyze Threats</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Analyze Threats & Countermeasures</p>
                <p className="text-xs text-muted-foreground">
                  Review and manage threats based on your diagram components
                </p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  )
})
