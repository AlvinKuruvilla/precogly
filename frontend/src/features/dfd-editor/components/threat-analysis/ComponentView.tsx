import { Fragment, useState, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Cog, Database, User, ChevronDown, ChevronUp, ChevronRight, X, Plus, ArrowRight, Shield, Building2, Lock, GripVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import type { DiagramNode, DataFlowEdge, CanvasData, TrustZoneNodeData } from '../../types'
import { getZoneColorConfig } from '../../types'
import type {
  ComponentThreat,
  ComponentThreatCountermeasure,
  CountermeasureStatus,
  ThreatStatus,
  ComplianceStandardMapping,
} from '../../types/threat-analysis'
import {
  deriveThreatStatus,
  COUNTERMEASURE_STATUS_CONFIG,
  THREAT_STATUS_CONFIG,
} from '../../types/threat-analysis'
import { TaxonomyBadges } from '@/components/shared/TaxonomyBadges'
import { EditComplianceMappingsDialog } from './EditComplianceMappingsDialog'
import { parseCountermeasureId, useUpdateThreat, useUpdateFlowThreat } from '@/features/threat-models/api/threats'
import {
  buildComponentTree,
  buildNodesMap,
  getAncestryPath,
  getDirectProcessChildren,
} from './hierarchy-utils'
import { PRIORITY_CONFIG } from './severity-utils'
import { SeverityAssessmentPanel, type SeverityAssessmentData } from './SeverityAssessmentPanel'
import { ActorImpactPanel, type ActorImpactData } from './ActorImpactPanel'
import { UserSearchCombobox } from './UserSearchCombobox'
import { WaiverReasonInput } from './WaiverReasonInput'
import { ComplianceDetailSection } from './ComplianceDetailSection'
import { CountermeasureStatusButtons } from './CountermeasureStatusButtons'
import { ComponentTreeItem } from './ComponentTreeItem'
import { ComponentDataAssetsDisplay } from './ComponentDataAssetsDisplay'
import { useTechnologies } from '../../api/component-library'
import { DataFlowAssetsDisplay } from './DataFlowAssetsDisplay'
import { SortableList } from '@/components/shared/SortableList'

/** Assignee type for the combobox — individuals only */
export type Assignee = { type: 'member'; userId: number; email: string; name: string | null }

// Icon map for node types
const nodeTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  process: Cog,
  datastore: Database,
  humanActor: User,
  systemActor: Building2,
}

interface ComponentViewProps {
  threatModelId: string
  canvasData: CanvasData
  analyzableComponents: DiagramNode[]
  trustZones: DiagramNode[]
  dataFlows: DataFlowEdge[]
  componentThreats: ComponentThreat[]
  selectedFrameworks: string[]
  selectedComponentId: string | null
  selectedThreatId: string | null
  selectedComponentThreat: ComponentThreat | null
  onSelectComponent: (componentId: string) => void
  onSelectThreat: (threatId: string) => void
  onCountermeasureStatusChange: (
    componentThreatId: string,
    countermeasureId: string,
    status: CountermeasureStatus,
    notes?: string
  ) => void
  onAssignOwner: (
    componentThreatId: string,
    countermeasureInstanceId: string,
    assignee: Assignee,
    newStatus?: CountermeasureStatus // Optional: also update status in the same API call
  ) => void
  onAddComponent: () => void
  onAddCustomThreat: () => void
  onDismissThreat: (componentThreatId: string) => void
  onRestoreThreat: (componentThreatId: string) => void
  onAddCustomCountermeasure: () => void
  onCountermeasurePriorityChange: (
    componentThreatId: string,
    countermeasureInstanceId: string,
    priority: ComponentThreatCountermeasure['priority']
  ) => void
  onRevertCountermeasure?: (componentThreatId: string, countermeasureInstanceId: string) => void
  onReorderThreats?: (componentId: string, reorderedThreats: ComponentThreat[]) => void
  onReorderCountermeasures?: (componentThreatId: string, reorderedCountermeasures: ComponentThreatCountermeasure[]) => void
  isSecurityTeam?: boolean
}

/**
 * Get threat summary for a component
 */
function getComponentThreatSummary(
  componentId: string,
  threats: ComponentThreat[]
): { total: number; exposed: number; addressable: number; mitigated: number } {
  const componentThreats = threats.filter(
    (t) => t.componentId === componentId && !t.dismissed
  )

  let exposed = 0
  let addressable = 0
  let mitigated = 0

  componentThreats.forEach((threat) => {
    const status = deriveThreatStatus(threat.countermeasures)
    if (status === 'exposed') exposed++
    else if (status === 'addressable') addressable++
    else mitigated++
  })

  return { total: componentThreats.length, exposed, addressable, mitigated }
}

/**
 * Status badge component
 */
function ThreatStatusBadge({ status }: { status: ThreatStatus }) {
  const config = THREAT_STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={cn('text-xs', config.bgColor)}>
      {config.label}
    </Badge>
  )
}

export function ComponentView({
  threatModelId: _threatModelId,
  canvasData,
  analyzableComponents,
  trustZones,
  dataFlows,
  componentThreats,
  selectedFrameworks: _selectedFrameworks,
  selectedComponentId,
  selectedThreatId,
  selectedComponentThreat,
  onSelectComponent,
  onSelectThreat,
  onCountermeasureStatusChange,
  onAssignOwner,
  onAddComponent,
  onAddCustomThreat,
  onDismissThreat,
  onRestoreThreat,
  onAddCustomCountermeasure,
  onCountermeasurePriorityChange,
  onRevertCountermeasure,
  onReorderThreats,
  onReorderCountermeasures,
  isSecurityTeam,
}: ComponentViewProps) {
  const [showDismissedThreats, setShowDismissedThreats] = useState(false)
  // Track which countermeasure is being assigned an owner (by countermeasure instance id)
  const [assigningOwnerFor, setAssigningOwnerFor] = useState<string | null>(null)
  // Track if we should set status to "planned" after owner assignment
  const [pendingPlannedStatus, setPendingPlannedStatus] = useState<string | null>(null)
  // Track which countermeasure is being waived (needs reason input)
  const [waivingReasonFor, setWaivingReasonFor] = useState<string | null>(null)
  // Track which countermeasures have expanded compliance sections
  const [expandedComplianceFor, setExpandedComplianceFor] = useState<Set<string>>(new Set())
  // Track collapsed nodes in the hierarchy tree
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  // Track which countermeasure is having its compliance mappings edited
  const [editingComplianceFor, setEditingComplianceFor] = useState<{
    id: string
    backendId: number
    type: 'component' | 'flow'
    name: string
    mappings: ComplianceStandardMapping[]
  } | null>(null)

  // Resolve technology slugs to display names
  const { technologies } = useTechnologies()
  const resolveTechName = useCallback(
    (value: string | undefined) => {
      if (!value) return ''
      const match = technologies.find(
        (t) => t.id === value || t.name.toLowerCase() === value.toLowerCase()
      )
      return match?.name ?? value
    },
    [technologies]
  )

  // Threat update mutations
  const updateThreatMutation = useUpdateThreat()
  const updateFlowThreatMutation = useUpdateFlowThreat()

  // Refs to collect latest data from child panels
  const severityDataRef = useRef<SeverityAssessmentData | null>(null)
  const actorImpactDataRef = useRef<ActorImpactData | null>(null)

  // Unified save handler — merges severity + actor/impact data into one PATCH
  const handleSaveThreat = useCallback((threat: ComponentThreat) => {
    if (!threat.backendThreatId) return
    const data: Record<string, unknown> = {}
    if (severityDataRef.current) {
      data.severityScoringMetadata = severityDataRef.current.severityScoringMetadata
      data.inherentSeverity = severityDataRef.current.inherentSeverity
    }
    if (actorImpactDataRef.current) {
      data.impactDescription = actorImpactDataRef.current.impactDescription
      data.threatActor = actorImpactDataRef.current.threatActor
      data.threatActorText = actorImpactDataRef.current.threatActorText
    }
    const onSuccess = () => { toast.success('Threat saved') }
    const onError = () => { toast.error('Failed to save threat') }
    if (threat.threatType === 'dataflow') {
      updateFlowThreatMutation.mutate({ threatId: threat.backendThreatId, data }, { onSuccess, onError })
    } else {
      updateThreatMutation.mutate({ threatId: threat.backendThreatId, data }, { onSuccess, onError })
    }
  }, [updateThreatMutation, updateFlowThreatMutation])

  // Derive actor nodes from analyzableComponents
  const actorNodes = useMemo(() => {
    return analyzableComponents
      .filter((node) => node.type === 'humanActor' || node.type === 'systemActor')
      .map((node) => ({
        nodeId: node.id,
        componentId: (node.data as { componentId?: number }).componentId || 0,
        name: String(node.data.label),
      }))
      .filter((actor) => actor.componentId > 0)
  }, [analyzableComponents])

  const toggleComplianceExpanded = (cmId: string) => {
    setExpandedComplianceFor(prev => {
      const next = new Set(prev)
      if (next.has(cmId)) {
        next.delete(cmId)
      } else {
        next.add(cmId)
      }
      return next
    })
  }

  // Build nodes map for hierarchy lookups
  const nodesMap = useMemo(
    () => buildNodesMap(canvasData.nodes),
    [canvasData.nodes]
  )

  // Build component tree for the left panel
  const { treeRoots, flatNonProcess } = useMemo(
    () => buildComponentTree(analyzableComponents, canvasData.nodes),
    [analyzableComponents, canvasData.nodes]
  )

  const toggleNodeCollapsed = useCallback((nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  // Get selected component or data flow
  const selectedComponent = useMemo(() => {
    if (!selectedComponentId) return null
    return canvasData.nodes.find((n) => n.id === selectedComponentId) || null
  }, [canvasData.nodes, selectedComponentId])

  const selectedDataFlow = useMemo(() => {
    if (!selectedComponentId) return null
    return dataFlows.find((e) => e.id === selectedComponentId) || null
  }, [dataFlows, selectedComponentId])

  const selectedTrustZone = useMemo(() => {
    if (!selectedComponentId) return null
    return trustZones.find((n) => n.id === selectedComponentId) || null
  }, [trustZones, selectedComponentId])

  // Ancestry path for breadcrumb (only for process nodes with ancestors)
  const ancestryPath = useMemo(() => {
    if (!selectedComponent || selectedComponent.type !== 'process') return []
    const path = getAncestryPath(selectedComponent.id, nodesMap)
    return path.length > 1 ? path : []
  }, [selectedComponent, nodesMap])

  // Direct process children of the selected component
  const childProcesses = useMemo(() => {
    if (!selectedComponent || selectedComponent.type !== 'process') return []
    return getDirectProcessChildren(selectedComponent.id, canvasData.nodes)
  }, [selectedComponent, canvasData.nodes])

  // Helper to get source and target node labels for a data flow
  const getDataFlowLabels = (edge: DataFlowEdge) => {
    const sourceNode = canvasData.nodes.find((n) => n.id === edge.source)
    const targetNode = canvasData.nodes.find((n) => n.id === edge.target)
    const sourceLabel = sourceNode ? String(sourceNode.data.label) : edge.source
    const targetLabel = targetNode ? String(targetNode.data.label) : edge.target
    return { sourceLabel, targetLabel }
  }

  // Get threats for selected component
  const threatsForComponent = useMemo(() => {
    if (!selectedComponentId) return []
    return componentThreats.filter((ct) => ct.componentId === selectedComponentId)
  }, [componentThreats, selectedComponentId])

  const activeThreats = useMemo(
    () => threatsForComponent.filter((t) => !t.dismissed).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [threatsForComponent]
  )
  const dismissedThreats = threatsForComponent.filter((t) => t.dismissed)

  // Selected threat already contains metadata from backend
  const selectedThreatDef = selectedComponentThreat

  // Handle owner assignment from UserSearchCombobox
  const handleAssignOwner = (countermeasureInstanceId: string, assignee: Assignee) => {
    if (selectedComponentThreat) {
      const statusToSet = pendingPlannedStatus ? 'planned' as CountermeasureStatus : undefined
      onAssignOwner(selectedComponentThreat.id, countermeasureInstanceId, assignee, statusToSet)

      if (pendingPlannedStatus) {
        setPendingPlannedStatus(null)
      }

      setAssigningOwnerFor(null)
    }
  }

  // Cancel owner assignment
  const handleCancelAssignment = () => {
    setAssigningOwnerFor(null)
    setPendingPlannedStatus(null)
  }

  // Handle waiver reason submission
  const handleWaiverSubmit = (countermeasureId: string, reason: string) => {
    if (selectedComponentThreat) {
      onCountermeasureStatusChange(selectedComponentThreat.id, countermeasureId, 'waived', reason)
      setWaivingReasonFor(null)
    }
  }

  // Cancel waiver reason input
  const handleCancelWaiver = () => {
    setWaivingReasonFor(null)
  }

  // Sort countermeasures by displayOrder
  const sortedCountermeasures = useMemo(
    () => [...(selectedComponentThreat?.countermeasures || [])].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    ),
    [selectedComponentThreat?.countermeasures]
  )

  // Total countermeasures count
  const totalCountermeasures = selectedComponentThreat?.countermeasures.length || 0
  const resolvedCountermeasures = selectedComponentThreat?.countermeasures.filter(
    (cm) => cm.status !== 'gap'
  ).length || 0

  return (
    <div className="min-h-0 flex-1 overflow-hidden h-full">
      <ResizablePanelGroup orientation="horizontal">
      {/* Column 1: Components */}
      <ResizablePanel defaultSize="20%" minSize="12%" maxSize="35%">
      <div className="h-full flex flex-col">
        {/* Components list header */}
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <div className="font-medium">Components & Zones</div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={onAddComponent}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {analyzableComponents.length} components &nbsp;|&nbsp;{' '}
            {trustZones.length} zones &nbsp;|&nbsp;{' '}
            {dataFlows.length} flows &nbsp;|&nbsp;{' '}
            {componentThreats.filter((t) => !t.dismissed).length} threats
          </div>
          {(() => {
            const summary = componentThreats.reduce(
              (acc, t) => {
                if (t.dismissed) return acc
                const status = deriveThreatStatus(t.countermeasures)
                if (status === 'exposed') acc.exposed++
                else if (status === 'addressable') acc.addressable++
                return acc
              },
              { exposed: 0, addressable: 0 }
            )
            if (summary.exposed > 0) {
              return (
                <Badge variant="outline" className="mt-1 bg-red-100 text-red-700 text-xs">
                  {summary.exposed} exposed
                </Badge>
              )
            }
            if (summary.addressable > 0) {
              return (
                <Badge variant="outline" className="mt-1 bg-yellow-100 text-yellow-700 text-xs">
                  {summary.addressable} in progress
                </Badge>
              )
            }
            return null
          })()}
        </div>

        {/* Components list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Process nodes as a tree */}
            {treeRoots.map((treeNode) => (
              <ComponentTreeItem
                key={treeNode.node.id}
                treeNode={treeNode}
                componentThreats={componentThreats}
                selectedComponentId={selectedComponentId}
                collapsedNodes={collapsedNodes}
                onSelectComponent={onSelectComponent}
                onToggleCollapsed={toggleNodeCollapsed}
                resolveTechName={resolveTechName}
              />
            ))}

            {/* Data Stores & Actors separator + flat list */}
            {flatNonProcess.length > 0 && (
              <>
                <div className="pt-3 pb-1 px-2 border-t mt-2">
                  <span className="text-xs font-medium text-muted-foreground">Data Stores & Actors</span>
                </div>
                {flatNonProcess.map((node) => {
                  const Icon = nodeTypeIcons[node.type as string] || Cog
                  const summary = getComponentThreatSummary(node.id, componentThreats)
                  const isSelected = node.id === selectedComponentId
                  const technologySlug = (node.data as { technology?: string }).technology
                  const technologyName = resolveTechName(technologySlug)
                  const nodeLabel = String(node.data.label)
                  const isDefaultLabel = nodeLabel.toLowerCase().includes('new ')
                  const displayName = !isDefaultLabel ? nodeLabel : (technologyName || nodeLabel)
                  const showSecondaryLabel = technologyName && !isDefaultLabel && nodeLabel !== technologyName

                  return (
                    <Fragment key={node.id}>
                      <button
                        onClick={() => onSelectComponent(node.id)}
                        className={cn(
                          'w-full text-left p-2 rounded-md transition-colors',
                          isSelected
                            ? 'bg-slate-100 border border-slate-300'
                            : 'hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">
                                {displayName}
                              </div>
                              {showSecondaryLabel && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {technologyName}
                                </div>
                              )}
                            </div>
                          </div>
                          {summary.exposed > 0 ? (
                            <Badge variant="outline" className="bg-red-100 text-red-700 text-xs ml-2 flex-shrink-0">
                              {summary.exposed} exposed
                            </Badge>
                          ) : summary.addressable > 0 ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs ml-2 flex-shrink-0">
                              {summary.addressable} in progress
                            </Badge>
                          ) : summary.total > 0 ? (
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                              No threats
                            </span>
                          ) : null}
                        </div>
                        {summary.total > 0 && (
                          <div className="flex items-center gap-1 mt-1 ml-6">
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full',
                                summary.exposed > 0 ? 'bg-red-500' : 'bg-yellow-500'
                              )}
                            />
                            <span className="text-xs text-muted-foreground">
                              {summary.total}
                            </span>
                          </div>
                        )}
                      </button>
                      {isSelected && (
                        <ComponentDataAssetsDisplay
                          componentId={(node.data as { componentId?: number }).componentId}
                        />
                      )}
                    </Fragment>
                  )
                })}
              </>
            )}

            {/* Trust Boundaries section */}
            {trustZones.length > 0 && (
              <>
                <div className="pt-3 pb-1 px-2 border-t mt-2">
                  <span className="text-xs font-medium text-muted-foreground">Trust Zones</span>
                </div>
                {trustZones.map((node) => {
                  const summary = getComponentThreatSummary(node.id, componentThreats)
                  const isSelected = node.id === selectedComponentId
                  const zoneData = node.data as TrustZoneNodeData
                  const zoneConfig = getZoneColorConfig(zoneData.zoneColor)

                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelectComponent(node.id)}
                      className={cn(
                        'w-full text-left p-2 rounded-md transition-colors',
                        isSelected
                          ? 'bg-slate-100 border border-slate-300'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Shield
                            className="h-4 w-4 flex-shrink-0"
                            style={{ color: zoneConfig.borderColor }}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {String(node.data.label)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              TL: {zoneData.trustLevel ?? 75}
                            </div>
                          </div>
                        </div>
                        {summary.exposed > 0 ? (
                          <Badge variant="outline" className="bg-red-100 text-red-700 text-xs ml-2 flex-shrink-0">
                            {summary.exposed} exposed
                          </Badge>
                        ) : summary.addressable > 0 ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs ml-2 flex-shrink-0">
                            {summary.addressable} in progress
                          </Badge>
                        ) : summary.total > 0 ? (
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            No threats
                          </span>
                        ) : null}
                      </div>
                      {summary.total > 0 && (
                        <div className="flex items-center gap-1 mt-1 ml-6">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              summary.exposed > 0 ? 'bg-red-500' : 'bg-yellow-500'
                            )}
                          />
                          <span className="text-xs text-muted-foreground">
                            {summary.total}
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </>
            )}

            {/* Data Flows section */}
            {dataFlows.length > 0 && (
              <>
                <div className="pt-3 pb-1 px-2 border-t mt-2">
                  <span className="text-xs font-medium text-muted-foreground">Data Flows</span>
                </div>
                {dataFlows.map((edge) => {
                  const summary = getComponentThreatSummary(edge.id, componentThreats)
                  const isSelected = edge.id === selectedComponentId
                  const { sourceLabel, targetLabel } = getDataFlowLabels(edge)
                  const flowLabel = edge.data?.label || `${sourceLabel} → ${targetLabel}`
                  const dataflowId = edge.data?.dataflowId as number | undefined

                  return (
                    <Fragment key={edge.id}>
                      <button
                        onClick={() => onSelectComponent(edge.id)}
                        className={cn(
                          'w-full text-left p-2 rounded-md transition-colors',
                          isSelected
                            ? 'bg-slate-100 border border-slate-300'
                            : 'hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">
                                {flowLabel}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {sourceLabel} → {targetLabel}
                              </div>
                            </div>
                          </div>
                          {summary.exposed > 0 ? (
                            <Badge variant="outline" className="bg-red-100 text-red-700 text-xs ml-2 flex-shrink-0">
                              {summary.exposed} exposed
                            </Badge>
                          ) : summary.addressable > 0 ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs ml-2 flex-shrink-0">
                              {summary.addressable} in progress
                            </Badge>
                          ) : summary.total > 0 ? (
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                              No threats
                            </span>
                          ) : null}
                        </div>
                        {summary.total > 0 && (
                          <div className="flex items-center gap-1 mt-1 ml-6">
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full',
                                summary.exposed > 0 ? 'bg-red-500' : 'bg-yellow-500'
                              )}
                            />
                            <span className="text-xs text-muted-foreground">
                              {summary.total}
                            </span>
                          </div>
                        )}
                      </button>
                      {isSelected && (
                        <DataFlowAssetsDisplay dataFlowId={dataflowId} />
                      )}
                    </Fragment>
                  )
                })}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Column 2: Threats */}
      <ResizablePanel defaultSize="35%" minSize="20%" maxSize="55%">
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <div className="font-medium">Threats</div>
            <div className="flex items-center gap-2">
              {activeThreats.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {activeThreats.length} active
                </Badge>
              )}
              {selectedComponentId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={onAddCustomThreat}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              )}
            </div>
          </div>
          {/* Breadcrumb path for nested process nodes */}
          {ancestryPath.length > 1 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5 flex-wrap">
              {ancestryPath.map((ancestor, index) => {
                const isLast = index === ancestryPath.length - 1
                const ancestorNodeLabel = String(ancestor.data.label)
                const ancestorTechName = resolveTechName((ancestor.data as { technology?: string }).technology)
                const ancestorLabel = ancestorNodeLabel.toLowerCase().includes('new ')
                  ? (ancestorTechName || ancestorNodeLabel)
                  : ancestorNodeLabel
                return (
                  <span key={ancestor.id} className="flex items-center gap-1">
                    {index > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                    {isLast ? (
                      <span className="font-semibold text-foreground">{ancestorLabel}</span>
                    ) : (
                      <button
                        className="hover:text-foreground hover:underline"
                        onClick={() => onSelectComponent(ancestor.id)}
                      >
                        {ancestorLabel}
                      </button>
                    )}
                  </span>
                )
              })}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {selectedComponent
              ? resolveTechName((selectedComponent.data as { technology?: string }).technology) || String(selectedComponent.data.label)
              : selectedTrustZone
                ? String(selectedTrustZone.data.label)
                : selectedDataFlow
                  ? (() => {
                      const { sourceLabel, targetLabel } = getDataFlowLabels(selectedDataFlow)
                      return selectedDataFlow.data?.label || `${sourceLabel} → ${targetLabel}`
                    })()
                  : 'Select a component, boundary, or data flow'}
          </div>
        </div>

        {/* Child Components section */}
        {childProcesses.length > 0 && (
          <div className="px-3 py-2 border-b">
            <div className="flex items-center gap-1.5 text-xs">
              <Cog className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Child Components</span>
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {childProcesses.length}
              </Badge>
            </div>
            <div className="mt-1.5 space-y-0.5">
              {childProcesses.map((child) => {
                const childNodeLabel = String(child.data.label)
                const childTechName = resolveTechName((child.data as { technology?: string }).technology)
                const childLabel = childNodeLabel.toLowerCase().includes('new ')
                  ? (childTechName || childNodeLabel)
                  : childNodeLabel
                const childSummary = getComponentThreatSummary(child.id, componentThreats)
                return (
                  <button
                    key={child.id}
                    className="w-full flex items-center gap-2 py-1 px-1 text-xs rounded hover:bg-slate-50"
                    onClick={() => onSelectComponent(child.id)}
                  >
                    {childSummary.exposed > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                    <span className="truncate text-blue-600 hover:underline">{childLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Active Threats - shown with dismiss button */}
            {activeThreats.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground px-2 py-1 mb-1">
                  Cross out threats that are not relevant
                </p>

                <SortableList
                  items={activeThreats}
                  getItemId={(ct) => ct.id}
                  onReorder={(reordered) => {
                    if (selectedComponentId && onReorderThreats) {
                      onReorderThreats(selectedComponentId, reordered)
                    }
                  }}
                  renderItem={(ct, dragHandleRef, _isDragging) => {
                    if (!ct.threatName) return null

                    const status = deriveThreatStatus(ct.countermeasures)
                    const isSelected = ct.id === selectedThreatId

                    return (
                      <div
                        className={cn(
                          'group p-2 rounded-md transition-colors',
                          isSelected
                            ? 'bg-slate-100 border border-slate-300'
                            : 'hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <div
                            ref={dragHandleRef}
                            className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectThreat(ct.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectThreat(ct.id) }}
                            className="flex-1 text-left min-w-0 overflow-hidden cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: THREAT_STATUS_CONFIG[status].color }}
                              />
                              <span className="font-medium text-sm truncate">
                                {ct.threatName}
                              </span>
                            </div>
                            {!isSelected && (
                              <div className="mt-1 ml-4">
                                <TaxonomyBadges entries={ct.taxonomyEntries} maxVisible={1} size="sm" />
                              </div>
                            )}
                          </div>
                          <ThreatStatusBadge status={status} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDismissThreat(ct.id)
                            }}
                            title="Dismiss threat"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {isSelected && (
                          <div className="mt-1 ml-4">
                            <TaxonomyBadges entries={ct.taxonomyEntries} size="sm" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="mt-1 ml-4 p-2 rounded-md bg-slate-50 border border-slate-200 space-y-3" onClick={(e) => e.stopPropagation()}>
                            <SeverityAssessmentPanel
                              threat={ct}
                              onChange={(data) => { severityDataRef.current = data }}
                            />
                            <ActorImpactPanel
                              threat={ct}
                              actorNodes={actorNodes}
                              onChange={(data) => { actorImpactDataRef.current = data }}
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs w-full"
                              onClick={() => handleSaveThreat(ct)}
                              disabled={updateThreatMutation.isPending || updateFlowThreatMutation.isPending}
                            >
                              {(updateThreatMutation.isPending || updateFlowThreatMutation.isPending) ? (
                                <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...</>
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
              </div>
            )}

            {/* Empty state */}
            {selectedComponentId && activeThreats.length === 0 && dismissedThreats.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No threats available for this component.</p>
              </div>
            )}

            {/* All threats dismissed state */}
            {selectedComponentId && activeThreats.length === 0 && dismissedThreats.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">All threats have been dismissed.</p>
                <p className="text-xs mt-1">Restore from the section below if needed.</p>
              </div>
            )}

            {/* Dismissed threats section */}
            {selectedComponentId && dismissedThreats.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <button
                  className="w-full flex items-center justify-between px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowDismissedThreats(!showDismissedThreats)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Dismissed</span>
                    <Badge variant="outline" className="text-xs bg-slate-100">
                      {dismissedThreats.length}
                    </Badge>
                  </div>
                  {showDismissedThreats ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showDismissedThreats && (
                  <div className="mt-2 space-y-1">
                    {dismissedThreats.map((ct) => {
                      // Use threat metadata from backend (stored in ComponentThreat)
                      if (!ct.threatName) return null

                      return (
                        <div
                          key={ct.id}
                          className="group flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-slate-50"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-muted-foreground line-through truncate block">
                              {ct.threatName}
                            </span>
                            <TaxonomyBadges entries={ct.taxonomyEntries} maxVisible={1} size="sm" />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => onRestoreThreat(ct.id)}
                          >
                            Restore
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Column 3: Countermeasures */}
      <ResizablePanel defaultSize="45%" minSize="20%">
      <div className="h-full flex flex-col">
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <div>
            <div className="font-medium">Countermeasures</div>
            <div className="text-xs text-muted-foreground">
              {selectedThreatDef?.threatName || 'Select a threat'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedComponentThreat && (
              <ThreatStatusBadge status={deriveThreatStatus(selectedComponentThreat.countermeasures)} />
            )}
            {selectedComponentThreat && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={onAddCustomCountermeasure}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            )}
          </div>
        </div>

        {/* Legend */}
        {selectedComponentThreat && (
          <div className="px-4 py-2 border-b flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Platform</span>
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground/40">|</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Gap</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Planned</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Verified</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Waived</span>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {/* Countermeasures */}
            {selectedComponentThreat && sortedCountermeasures.length > 0 && (
              <SortableList
                items={sortedCountermeasures}
                getItemId={(cm) => cm.id}
                onReorder={(reordered) => {
                  if (selectedComponentThreat && onReorderCountermeasures) {
                    onReorderCountermeasures(selectedComponentThreat.id, reordered)
                  }
                }}
                renderItem={(cm, dragHandleRef, _isDragging) => {
                  const cmName = cm.countermeasureName || cm.countermeasureId
                  const cmDescription = cm.countermeasureDescription

                  const statusConfig = COUNTERMEASURE_STATUS_CONFIG[cm.status]
                  const isAssigning = assigningOwnerFor === cm.id
                  const isWaiving = waivingReasonFor === cm.id

                  return (
                    <div className="group border rounded-lg p-3 mb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            ref={dragHandleRef}
                            className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: statusConfig.color }}
                          />
                          <div>
                            <div className="font-medium text-sm">{cmName}</div>
                            {cmDescription && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {cmDescription}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Compliance mappings - expandable detail */}
                      {cm.standardMappings && cm.standardMappings.length > 0 ? (
                        <ComplianceDetailSection
                          mappings={cm.standardMappings}
                          isExpanded={expandedComplianceFor.has(cm.id)}
                          onToggle={() => toggleComplianceExpanded(cm.id)}
                          onEdit={() => {
                            const parsed = parseCountermeasureId(cm.id)
                            if (parsed.id !== null && parsed.type !== 'local') {
                              setEditingComplianceFor({
                                id: cm.id,
                                backendId: parsed.id,
                                type: parsed.type,
                                name: cmName,
                                mappings: cm.standardMappings || [],
                              })
                            }
                          }}
                        />
                      ) : (
                        <button
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          onClick={() => {
                            const parsed = parseCountermeasureId(cm.id)
                            if (parsed.id !== null && parsed.type !== 'local') {
                              setEditingComplianceFor({
                                id: cm.id,
                                backendId: parsed.id,
                                type: parsed.type,
                                name: cmName,
                                mappings: [],
                              })
                            }
                          }}
                        >
                          <Shield className="h-3 w-3" />
                          <span>Add compliance mapping</span>
                        </button>
                      )}

                      {/* Priority */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Priority:</span>
                        <Select
                          value={cm.priority || 'none'}
                          onValueChange={(value) => {
                            onCountermeasurePriorityChange(
                              selectedComponentThreat.id,
                              cm.id,
                              value as ComponentThreatCountermeasure['priority']
                            )
                          }}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <Badge variant="outline" className={cn('text-[10px]', config.color)}>
                                  {config.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Owner display */}
                      {cm.owner && !isAssigning && (
                        <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{cm.owner}</span>
                        </div>
                      )}

                      {/* Provided by boundary badge */}
                      {cm.providedByBoundaryId && (
                        <div className="mt-2 text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded border border-green-200">
                          <Shield className="h-3 w-3" />
                          <span>
                            Provided by{' '}
                            <span className="font-medium">
                              {(() => {
                                const boundary = canvasData.nodes.find((n) => n.id === cm.providedByBoundaryId)
                                if (!boundary) return 'boundary'
                                const zoneData = boundary.data as TrustZoneNodeData
                                return String(zoneData.label || 'boundary')
                              })()}
                            </span>
                          </span>
                        </div>
                      )}

                      {/* Inherited from zone badge */}
                      {cm.isInherited && cm.inheritedFromZoneName && (
                        <div className="mt-2 text-xs text-purple-600 flex items-center gap-1 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                          <Shield className="h-3 w-3" />
                          <span className="flex-1">
                            Inherited from{' '}
                            <span className="font-medium">
                              {cm.inheritedFromComponentName}
                            </span>
                            {' '}({cm.inheritedFromZoneName})
                          </span>
                          {onRevertCountermeasure && selectedComponentThreat && (
                            <button
                              className="text-purple-500 hover:text-purple-700 underline ml-2"
                              onClick={() => onRevertCountermeasure(selectedComponentThreat.id, cm.id)}
                            >
                              Revert
                            </button>
                          )}
                        </div>
                      )}

                      {/* Waiver reason display */}
                      {cm.status === 'waived' && cm.notes && !isWaiving && (
                        <div className="mt-2 text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-200">
                          <span className="font-medium text-blue-700">Waiver reason:</span>{' '}
                          {cm.notes}
                        </div>
                      )}

                      {/* Owner assignment UI */}
                      {isAssigning ? (
                        <div className="mt-3">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            {pendingPlannedStatus === cm.countermeasureId
                              ? 'Assign an owner to mark as Planned:'
                              : 'Assign owner:'}
                          </div>
                          <UserSearchCombobox
                            value={cm.owner || ''}
                            onSelect={(user) => handleAssignOwner(cm.id, user)}
                            onCancel={handleCancelAssignment}
                          />
                        </div>
                      ) : isWaiving ? (
                        <div className="mt-3">
                          <WaiverReasonInput
                            onSubmit={(reason) => handleWaiverSubmit(cm.id, reason)}
                            onCancel={handleCancelWaiver}
                          />
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between">
                          <CountermeasureStatusButtons
                            status={cm.status}
                            isPlatformLevel={cm.status === 'platform'}
                            isSecurityTeam={isSecurityTeam}
                            hasOwner={!!cm.owner}
                            onChange={(status) =>
                              onCountermeasureStatusChange(
                                selectedComponentThreat.id,
                                cm.id,
                                status
                              )
                            }
                            onPlannedWithoutOwner={() => {
                              setAssigningOwnerFor(cm.id)
                              setPendingPlannedStatus(cm.countermeasureId)
                            }}
                            onWaivedWithoutReason={() => {
                              setWaivingReasonFor(cm.id)
                            }}
                          />
                          {!cm.owner && cm.status !== 'platform' && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => setAssigningOwnerFor(cm.id)}
                            >
                              Assign owner
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }}
              />
            )}


          </div>
        </ScrollArea>

        {/* Footer */}
        {selectedComponentThreat && (
          <div className="px-4 py-2 border-t text-xs text-muted-foreground flex justify-between">
            <span>{totalCountermeasures} countermeasures</span>
            <span>{resolvedCountermeasures} resolved</span>
          </div>
        )}
      </div>
      </ResizablePanel>
      </ResizablePanelGroup>

      {/* Edit Compliance Mappings Dialog */}
      {editingComplianceFor && (
        <EditComplianceMappingsDialog
          open={!!editingComplianceFor}
          onOpenChange={(open) => {
            if (!open) setEditingComplianceFor(null)
          }}
          countermeasureId={editingComplianceFor.backendId}
          countermeasureType={editingComplianceFor.type}
          countermeasureName={editingComplianceFor.name}
          libraryMappings={editingComplianceFor.mappings}
        />
      )}
    </div>
  )
}
