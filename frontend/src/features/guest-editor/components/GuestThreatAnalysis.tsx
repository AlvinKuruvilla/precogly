import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Cog,
  Database,
  User,
  Building2,
  ArrowRight,
  Box,
  Plus,
  Trash2,
  Pencil,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import { useGuestEditor } from '../context/GuestEditorContext'
import { GuestThreatDialog } from './GuestAddThreatDialog'
import { GuestCountermeasureDialog } from './GuestCountermeasureDialog'
import type { GuestThreat, GuestCountermeasure } from '../types'
import { STRIDE_CONFIG } from '@/types/domain'

const SEVERITY_COLORS: Record<GuestThreat['severity'], string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

const CONTROL_TYPE_COLORS: Record<GuestCountermeasure['controlType'], string> = {
  preventive: 'bg-green-100 text-green-800',
  detective: 'bg-blue-100 text-blue-800',
  corrective: 'bg-orange-100 text-orange-800',
  deterrent: 'bg-purple-100 text-purple-800',
  recovery: 'bg-teal-100 text-teal-800',
  compensating: 'bg-amber-100 text-amber-800',
  procedural: 'bg-gray-100 text-gray-800',
}

const NODE_TYPE_ICON: Record<string, typeof Cog> = {
  process: Cog,
  datastore: Database,
  humanActor: User,
  systemActor: Building2,
  systemScope: Box,
}

const NODE_TYPE_LABELS: Record<string, string> = {
  process: 'Processes',
  datastore: 'Data Stores',
  humanActor: 'Human Actors',
  systemActor: 'System Actors',
  systemScope: 'System Scope',
}

interface ComponentItem {
  id: string
  label: string
  type: string
  targetType: GuestThreat['targetType']
}

export function GuestThreatAnalysis() {
  const navigate = useNavigate()
  const guestEditor = useGuestEditor()

  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null)

  // Threat dialog state
  const [showThreatDialog, setShowThreatDialog] = useState(false)
  const [editingThreat, setEditingThreat] = useState<GuestThreat | undefined>(undefined)

  // Countermeasure dialog state
  const [showCountermeasureDialog, setShowCountermeasureDialog] = useState(false)
  const [editingCountermeasure, setEditingCountermeasure] = useState<
    GuestCountermeasure | undefined
  >(undefined)

  if (!guestEditor) return null

  const { nodes, edges } = guestEditor

  // Build component list grouped by type
  const componentsByType = useMemo(() => {
    const groups: Record<string, ComponentItem[]> = {}

    for (const node of nodes) {
      if (node.type === 'trustZone') continue
      const nodeType = node.type || 'process'
      if (!groups[nodeType]) groups[nodeType] = []
      groups[nodeType].push({
        id: node.id,
        label: node.data.label || nodeType,
        type: nodeType,
        targetType: nodeType === 'systemScope' ? 'systemScope' : 'component',
      })
    }

    return groups
  }, [nodes])

  // Data flows from edges
  const dataFlows = useMemo(
    () =>
      edges
        .filter((e) => e.type === 'dataFlow')
        .map((e) => ({
          id: e.id,
          label: e.data?.label || 'Data Flow',
          type: 'dataFlow' as const,
          targetType: 'dataflow' as const,
        })),
    [edges]
  )

  // Find selected component info
  const selectedComponent = useMemo(() => {
    if (!selectedComponentId) return null
    for (const items of Object.values(componentsByType)) {
      const found = items.find((i) => i.id === selectedComponentId)
      if (found) return found
    }
    return dataFlows.find((f) => f.id === selectedComponentId) || null
  }, [selectedComponentId, componentsByType, dataFlows])

  // Threats for selected component
  const threatsForSelected = selectedComponentId
    ? guestEditor.getThreatsForTarget(selectedComponentId)
    : []

  // Find selected threat
  const selectedThreat = selectedThreatId
    ? threatsForSelected.find((t) => t.id === selectedThreatId) || null
    : null

  // Countermeasures for selected threat
  const countermeasuresForThreat = selectedThreatId
    ? guestEditor.getCountermeasuresForThreat(selectedThreatId)
    : []

  const handleSelectComponent = (componentId: string) => {
    setSelectedComponentId(componentId)
    setSelectedThreatId(null)
  }

  const handleSelectThreat = (threatId: string) => {
    setSelectedThreatId(threatId)
  }

  const handleAddThreat = () => {
    setEditingThreat(undefined)
    setShowThreatDialog(true)
  }

  const handleEditThreat = (threat: GuestThreat) => {
    setEditingThreat(threat)
    setShowThreatDialog(true)
  }

  const handleDeleteThreat = (threatId: string) => {
    guestEditor.removeThreat(threatId)
    if (selectedThreatId === threatId) {
      setSelectedThreatId(null)
    }
  }

  const handleAddCountermeasure = () => {
    setEditingCountermeasure(undefined)
    setShowCountermeasureDialog(true)
  }

  const handleEditCountermeasure = (countermeasure: GuestCountermeasure) => {
    setEditingCountermeasure(countermeasure)
    setShowCountermeasureDialog(true)
  }

  const handleDeleteCountermeasure = (countermeasureId: string) => {
    guestEditor.removeCountermeasure(countermeasureId)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Subheader */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/guest')}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Diagram
        </Button>
        <div className="h-4 w-px bg-border" />
        <h2 className="text-sm font-medium">Threat Analysis</h2>
      </div>

      {/* 3-column layout */}
      <div className="min-h-0 flex-1 overflow-hidden h-full">
        <ResizablePanelGroup orientation="horizontal">
          {/* Column 1: Components & Zones */}
          <ResizablePanel defaultSize="25%" minSize="15%" maxSize="35%">
            <div className="h-full flex flex-col border-r">
              <div className="px-3 py-2 border-b bg-muted/20">
                <h3 className="text-sm font-medium">Components</h3>
                <p className="text-xs text-muted-foreground">
                  {nodes.filter((n) => n.type !== 'trustZone').length} components,{' '}
                  {dataFlows.length} flows
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-3">
                  {Object.entries(componentsByType).map(([nodeType, items]) => {
                    const Icon = NODE_TYPE_ICON[nodeType] || Cog
                    const groupLabel = NODE_TYPE_LABELS[nodeType] || nodeType
                    return (
                      <div key={nodeType}>
                        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <Icon className="h-3 w-3" />
                          {groupLabel}
                        </div>
                        <div className="space-y-0.5">
                          {items.map((item) => {
                            const threatCount = guestEditor.getThreatCount(item.id)
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleSelectComponent(item.id)}
                                className={cn(
                                  'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted/50',
                                  selectedComponentId === item.id && 'bg-muted'
                                )}
                              >
                                <span className="truncate">{item.label}</span>
                                {threatCount > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="h-5 px-1.5 text-xs shrink-0"
                                  >
                                    {threatCount}
                                  </Badge>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {/* Data Flows section */}
                  {dataFlows.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <ArrowRight className="h-3 w-3" />
                        Data Flows
                      </div>
                      <div className="space-y-0.5">
                        {dataFlows.map((flow) => {
                          const threatCount = guestEditor.getThreatCount(flow.id)
                          return (
                            <button
                              key={flow.id}
                              onClick={() => handleSelectComponent(flow.id)}
                              className={cn(
                                'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted/50',
                                selectedComponentId === flow.id && 'bg-muted'
                              )}
                            >
                              <span className="truncate">{flow.label}</span>
                              {threatCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="h-5 px-1.5 text-xs shrink-0"
                                >
                                  {threatCount}
                                </Badge>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {Object.keys(componentsByType).length === 0 &&
                    dataFlows.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                        No components in the diagram yet. Add components on the
                        canvas first.
                      </p>
                    )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Column 2: Threats for selected component */}
          <ResizablePanel defaultSize="35%" minSize="20%" maxSize="55%">
            <div className="h-full flex flex-col border-r">
              <div className="px-3 py-2 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    {selectedComponent
                      ? `Threats — ${selectedComponent.label}`
                      : 'Threats'}
                  </h3>
                  {selectedComponent && (
                    <p className="text-xs text-muted-foreground">
                      {threatsForSelected.length} threat
                      {threatsForSelected.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                {selectedComponent && (
                  <Button size="sm" variant="outline" onClick={handleAddThreat} className="gap-1">
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {!selectedComponent ? (
                    <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                      Select a component to view its threats.
                    </p>
                  ) : threatsForSelected.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                      No threats for this component. Click "Add" to create one.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {threatsForSelected.map((threat) => {
                        const countermeasureCount =
                          guestEditor.getCountermeasureCount(threat.id)
                        return (
                          <button
                            key={threat.id}
                            onClick={() => handleSelectThreat(threat.id)}
                            className={cn(
                              'w-full flex items-center justify-between gap-2 p-2 rounded-md text-sm text-left hover:bg-muted/50 group',
                              selectedThreatId === threat.id && 'bg-muted'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'shrink-0 text-xs',
                                  SEVERITY_COLORS[threat.severity]
                                )}
                              >
                                {threat.severity}
                              </Badge>
                              {threat.category && STRIDE_CONFIG[threat.category] && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-xs border"
                                  style={{
                                    color: STRIDE_CONFIG[threat.category].color,
                                    borderColor: STRIDE_CONFIG[threat.category].color,
                                  }}
                                >
                                  {STRIDE_CONFIG[threat.category].label}
                                </Badge>
                              )}
                              <span className="truncate">{threat.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {countermeasureCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="h-5 px-1.5 text-xs gap-0.5"
                                >
                                  <Shield className="h-2.5 w-2.5" />
                                  {countermeasureCount}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditThreat(threat)
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteThreat(threat.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Column 3: Countermeasures for selected threat */}
          <ResizablePanel defaultSize="40%" minSize="20%">
            <div className="h-full flex flex-col">
              <div className="px-3 py-2 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    {selectedThreat
                      ? `Countermeasures — ${selectedThreat.name}`
                      : 'Countermeasures'}
                  </h3>
                  {selectedThreat && (
                    <p className="text-xs text-muted-foreground">
                      {countermeasuresForThreat.length} countermeasure
                      {countermeasuresForThreat.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                {selectedThreat && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddCountermeasure}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {!selectedThreat ? (
                    <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                      Select a threat to view its countermeasures.
                    </p>
                  ) : countermeasuresForThreat.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                      No countermeasures yet. Click "Add" to create one.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {countermeasuresForThreat.map((countermeasure) => (
                        <div
                          key={countermeasure.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card text-sm group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'shrink-0 text-xs capitalize',
                                CONTROL_TYPE_COLORS[countermeasure.controlType]
                              )}
                            >
                              {countermeasure.controlType}
                            </Badge>
                            <div className="min-w-0">
                              <span className="truncate block">
                                {countermeasure.name}
                              </span>
                              {countermeasure.description && (
                                <span className="text-xs text-muted-foreground truncate block">
                                  {countermeasure.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() =>
                                handleEditCountermeasure(countermeasure)
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                              onClick={() =>
                                handleDeleteCountermeasure(countermeasure.id)
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Dialogs */}
      {selectedComponent && (
        <GuestThreatDialog
          open={showThreatDialog}
          onOpenChange={setShowThreatDialog}
          targetId={selectedComponent.id}
          targetType={selectedComponent.targetType}
          targetName={selectedComponent.label}
          editThreat={editingThreat}
        />
      )}

      {selectedThreat && (
        <GuestCountermeasureDialog
          open={showCountermeasureDialog}
          onOpenChange={setShowCountermeasureDialog}
          threatId={selectedThreat.id}
          threatName={selectedThreat.name}
          editCountermeasure={editingCountermeasure}
        />
      )}
    </div>
  )
}
