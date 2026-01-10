import { useState, useMemo } from 'react'
import { Cog, Database, User, ChevronDown, ChevronUp, X, Lock, Check, ChevronsUpDown, Plus, ArrowRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

// Mock team members data
const TEAM_MEMBERS = [
  { id: '1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@company.com', role: 'Security Engineer' },
  { id: '2', firstName: 'Michael', lastName: 'Rodriguez', email: 'michael.rodriguez@company.com', role: 'DevOps Lead' },
  { id: '3', firstName: 'Emily', lastName: 'Johnson', email: 'emily.johnson@company.com', role: 'Platform Engineer' },
  { id: '4', firstName: 'David', lastName: 'Kim', email: 'david.kim@company.com', role: 'Security Architect' },
  { id: '5', firstName: 'Jessica', lastName: 'Williams', email: 'jessica.williams@company.com', role: 'SRE' },
  { id: '6', firstName: 'James', lastName: 'Brown', email: 'james.brown@company.com', role: 'Backend Engineer' },
  { id: '7', firstName: 'Amanda', lastName: 'Davis', email: 'amanda.davis@company.com', role: 'Infrastructure Lead' },
  { id: '8', firstName: 'Robert', lastName: 'Martinez', email: 'robert.martinez@company.com', role: 'Cloud Engineer' },
  { id: '9', firstName: 'Lisa', lastName: 'Anderson', email: 'lisa.anderson@company.com', role: 'Security Analyst' },
  { id: '10', firstName: 'Christopher', lastName: 'Taylor', email: 'christopher.taylor@company.com', role: 'Tech Lead' },
]

type TeamMember = typeof TEAM_MEMBERS[number]
import type { DiagramNode, DataFlowEdge, CanvasData, TrustBoundaryNodeData } from '../../types'
import { TRUST_BOUNDARY_TYPE_CONFIG } from '../../types'
import type {
  ComponentThreat,
  CountermeasureStatus,
  ThreatStatus,
} from '../../types/threat-analysis'
import {
  deriveThreatStatus,
  COUNTERMEASURE_STATUS_CONFIG,
  THREAT_STATUS_CONFIG,
} from '../../types/threat-analysis'
import {
  getThreatById,
  STRIDE_CONFIG,
} from '../../lib/threat-registry'
import {
  getCountermeasureById,
  getCountermeasuresForThreat,
  SECURITY_STANDARDS,
} from '../../lib/countermeasure-registry'
import { getTechnologyById } from '../../lib/technology-registry'

// Icon map for node types
const nodeTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  process: Cog,
  datastore: Database,
  actor: User,
}

/**
 * Searchable user dropdown component
 */
function UserSearchCombobox({
  value,
  onSelect,
  onCancel,
}: {
  value: string
  onSelect: (user: TeamMember) => void
  onCancel: () => void
}) {
  const [open, setOpen] = useState(true)
  const [search, setSearch] = useState('')

  const selectedUser = TEAM_MEMBERS.find((u) => u.email === value)

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between h-9 text-sm font-normal"
          >
            {selectedUser ? (
              <span className="truncate">
                {selectedUser.firstName} {selectedUser.lastName}
              </span>
            ) : (
              <span className="text-muted-foreground">Select team member...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search by name or email..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No team member found.</CommandEmpty>
              <CommandGroup>
                {TEAM_MEMBERS.filter((user) => {
                  const searchLower = search.toLowerCase()
                  return (
                    user.firstName.toLowerCase().includes(searchLower) ||
                    user.lastName.toLowerCase().includes(searchLower) ||
                    user.email.toLowerCase().includes(searchLower) ||
                    user.role.toLowerCase().includes(searchLower)
                  )
                }).map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.firstName} ${user.lastName} ${user.email}`}
                    onSelect={() => {
                      onSelect(user)
                      setOpen(false)
                    }}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === user.email ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.role}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8 flex-1"
          disabled={!selectedUser}
          onClick={() => selectedUser && onSelect(selectedUser)}
        >
          Assign
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

/**
 * Waiver reason input component
 */
function WaiverReasonInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium text-muted-foreground">
        Provide a reason for waiving this countermeasure:
      </div>
      <Textarea
        placeholder="e.g., Risk accepted by security team due to compensating controls..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-[80px] text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8 flex-1"
          disabled={!reason.trim()}
          onClick={() => onSubmit(reason.trim())}
        >
          Waive with Reason
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface ComponentViewProps {
  canvasData: CanvasData
  analyzableComponents: DiagramNode[]
  trustBoundaries: DiagramNode[]
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
    countermeasureId: string,
    owner: string
  ) => void
  onAddCustomThreat: (componentId: string, threatId: string) => void
  onDismissThreat: (componentThreatId: string) => void
  onRestoreThreat: (componentThreatId: string) => void
  onAddCustomCountermeasure: (componentThreatId: string, countermeasureId: string) => void
  onRemoveCountermeasure: (componentThreatId: string, countermeasureInstanceId: string) => void
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

/**
 * Countermeasure status button group
 */
function CountermeasureStatusButtons({
  status,
  isPlatformLevel,
  hasOwner,
  onChange,
  onPlannedWithoutOwner,
  onWaivedWithoutReason,
}: {
  status: CountermeasureStatus
  isPlatformLevel: boolean
  hasOwner: boolean
  onChange: (status: CountermeasureStatus) => void
  onPlannedWithoutOwner: () => void
  onWaivedWithoutReason: () => void
}) {
  const statuses: CountermeasureStatus[] = ['gap', 'planned', 'waived']

  const handleStatusClick = (newStatus: CountermeasureStatus) => {
    // If clicking "Planned" and no owner assigned, trigger owner assignment first
    if (newStatus === 'planned' && !hasOwner) {
      onPlannedWithoutOwner()
      return
    }
    // If clicking "Waived", trigger waiver reason input first
    if (newStatus === 'waived') {
      onWaivedWithoutReason()
      return
    }
    onChange(newStatus)
  }

  return (
    <div className="flex items-center gap-1">
      {isPlatformLevel && status === 'platform' && (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-700 border-green-300 cursor-default"
        >
          <Lock className="h-3 w-3 mr-1" />
          Platform
        </Badge>
      )}
      {statuses.map((s) => {
        const config = COUNTERMEASURE_STATUS_CONFIG[s]
        const isActive = status === s
        return (
          <Button
            key={s}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-7 px-2 text-xs',
              isActive && s === 'gap' && 'bg-red-500 hover:bg-red-600',
              isActive && s === 'planned' && 'bg-yellow-500 hover:bg-yellow-600 text-black',
              isActive && s === 'waived' && 'bg-blue-500 hover:bg-blue-600'
            )}
            onClick={() => handleStatusClick(s)}
          >
            {config.label}
          </Button>
        )
      })}
    </div>
  )
}

export function ComponentView({
  canvasData,
  analyzableComponents,
  trustBoundaries,
  dataFlows,
  componentThreats,
  selectedFrameworks,
  selectedComponentId,
  selectedThreatId,
  selectedComponentThreat,
  onSelectComponent,
  onSelectThreat,
  onCountermeasureStatusChange,
  onAssignOwner,
  onAddCustomThreat: _onAddCustomThreat,
  onDismissThreat,
  onRestoreThreat,
  onAddCustomCountermeasure,
  onRemoveCountermeasure,
}: ComponentViewProps) {
  // Mark as unused for now - may use later for adding custom threats
  void _onAddCustomThreat
  const [showDismissedThreats, setShowDismissedThreats] = useState(false)
  // Track which countermeasure is being assigned an owner (by countermeasure instance id)
  const [assigningOwnerFor, setAssigningOwnerFor] = useState<string | null>(null)
  // Track if we should set status to "planned" after owner assignment
  const [pendingPlannedStatus, setPendingPlannedStatus] = useState<string | null>(null)
  // Track which countermeasure is being waived (needs reason input)
  const [waivingReasonFor, setWaivingReasonFor] = useState<string | null>(null)

  // Get selected component or data flow
  const selectedComponent = useMemo(() => {
    if (!selectedComponentId) return null
    return canvasData.nodes.find((n) => n.id === selectedComponentId) || null
  }, [canvasData.nodes, selectedComponentId])

  const selectedDataFlow = useMemo(() => {
    if (!selectedComponentId) return null
    return dataFlows.find((e) => e.id === selectedComponentId) || null
  }, [dataFlows, selectedComponentId])

  const selectedTrustBoundary = useMemo(() => {
    if (!selectedComponentId) return null
    return trustBoundaries.find((n) => n.id === selectedComponentId) || null
  }, [trustBoundaries, selectedComponentId])

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

  const activeThreats = threatsForComponent.filter((t) => !t.dismissed)
  const dismissedThreats = threatsForComponent.filter((t) => t.dismissed)

  // Get threat definition for selected threat
  const selectedThreatDef = useMemo(() => {
    if (!selectedComponentThreat) return null
    return getThreatById(selectedComponentThreat.threatId)
  }, [selectedComponentThreat])

  // Get countermeasures available but not added
  const availableCountermeasures = useMemo(() => {
    if (!selectedComponentThreat) return []

    const existingCmIds = new Set(
      selectedComponentThreat.countermeasures.map((cm) => cm.countermeasureId)
    )

    const forThreat = getCountermeasuresForThreat(selectedComponentThreat.threatId)
    return forThreat.filter((cm) => !existingCmIds.has(cm.id))
  }, [selectedComponentThreat])

  // Handle owner assignment from UserSearchCombobox
  const handleAssignOwner = (countermeasureId: string, user: TeamMember) => {
    if (selectedComponentThreat) {
      onAssignOwner(selectedComponentThreat.id, countermeasureId, user.email)

      // If this was triggered by clicking "Planned", also set the status to planned
      if (pendingPlannedStatus === countermeasureId) {
        onCountermeasureStatusChange(selectedComponentThreat.id, countermeasureId, 'planned')
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

  // Total countermeasures count
  const totalCountermeasures = selectedComponentThreat?.countermeasures.length || 0
  const resolvedCountermeasures = selectedComponentThreat?.countermeasures.filter(
    (cm) => cm.status === 'platform' || cm.status === 'planned' || cm.status === 'waived'
  ).length || 0

  return (
    <div className="flex h-full">
      {/* Column 1: Components */}
      <div className="w-64 border-r flex flex-col">
        {/* Components list header */}
        <div className="px-3 py-2 border-b">
          <div className="font-medium">Components & Boundaries</div>
          <div className="text-xs text-muted-foreground">
            {analyzableComponents.length} components &nbsp;|&nbsp;{' '}
            {trustBoundaries.length} boundaries &nbsp;|&nbsp;{' '}
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
            {analyzableComponents.map((node) => {
              const Icon = nodeTypeIcons[node.type as string] || Cog
              const summary = getComponentThreatSummary(node.id, componentThreats)
              const isSelected = node.id === selectedComponentId
              const techId = (node.data as { technology?: string }).technology
              const tech = techId ? getTechnologyById(techId) : null

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
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {String(node.data.label)}
                        </div>
                        {tech && (
                          <div className="text-xs text-muted-foreground truncate">
                            {tech.name}
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
              )
            })}

            {/* Trust Boundaries section */}
            {trustBoundaries.length > 0 && (
              <>
                <div className="pt-3 pb-1 px-2 border-t mt-2">
                  <span className="text-xs font-medium text-muted-foreground">Trust Boundaries</span>
                </div>
                {trustBoundaries.map((node) => {
                  const summary = getComponentThreatSummary(node.id, componentThreats)
                  const isSelected = node.id === selectedComponentId
                  const boundaryData = node.data as TrustBoundaryNodeData
                  const boundaryConfig = boundaryData.boundaryType
                    ? TRUST_BOUNDARY_TYPE_CONFIG[boundaryData.boundaryType]
                    : null

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
                            style={{ color: boundaryConfig?.borderColor || '#64748b' }}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {String(node.data.label)}
                            </div>
                            {boundaryConfig && (
                              <div className="text-xs text-muted-foreground truncate">
                                {boundaryConfig.label}
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

                  return (
                    <button
                      key={edge.id}
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
                  )
                })}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Column 2: Threats */}
      <div className="w-96 border-r flex flex-col">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <div className="font-medium">Threats</div>
            {activeThreats.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {activeThreats.length} active
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {selectedComponent
              ? String(selectedComponent.data.label)
              : selectedTrustBoundary
                ? String(selectedTrustBoundary.data.label)
                : selectedDataFlow
                  ? (() => {
                      const { sourceLabel, targetLabel } = getDataFlowLabels(selectedDataFlow)
                      return selectedDataFlow.data?.label || `${sourceLabel} → ${targetLabel}`
                    })()
                  : 'Select a component, boundary, or data flow'}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Active Threats - shown with dismiss button */}
            {activeThreats.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground px-2 py-1 mb-1">
                  Cross out threats that are not relevant
                </p>

                {activeThreats.map((ct) => {
                  const threatDef = getThreatById(ct.threatId)
                  if (!threatDef) return null

                  const status = deriveThreatStatus(ct.countermeasures)
                  const isSelected = ct.id === selectedThreatId

                  return (
                    <div
                      key={ct.id}
                      className={cn(
                        'group flex items-center gap-1 p-2 rounded-md transition-colors',
                        isSelected
                          ? 'bg-slate-100 border border-slate-300'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      <button
                        onClick={() => onSelectThreat(ct.id)}
                        className="flex-1 text-left min-w-0 overflow-hidden"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: THREAT_STATUS_CONFIG[status].color }}
                          />
                          <span className="font-medium text-sm truncate">
                            {threatDef.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 ml-4">
                          {STRIDE_CONFIG[threatDef.strideCategory].label}
                        </div>
                      </button>
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
                  )
                })}
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
                      const threatDef = getThreatById(ct.threatId)
                      if (!threatDef) return null

                      return (
                        <div
                          key={ct.id}
                          className="group flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-slate-50"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-muted-foreground line-through truncate block">
                              {threatDef.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {STRIDE_CONFIG[threatDef.strideCategory].label}
                            </span>
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

      {/* Column 3: Countermeasures */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <div>
            <div className="font-medium">Countermeasures</div>
            <div className="text-xs text-muted-foreground">
              {selectedThreatDef?.name || 'Select a threat'}
            </div>
          </div>
          {selectedComponentThreat && (
            <ThreatStatusBadge status={deriveThreatStatus(selectedComponentThreat.countermeasures)} />
          )}
        </div>

        {/* Legend */}
        {selectedComponentThreat && (
          <div className="px-4 py-2 border-b flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Platform</span>
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Gap</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Planned</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Waived</span>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {selectedComponentThreat?.countermeasures.map((cm) => {
              const cmDef = getCountermeasureById(cm.countermeasureId)
              if (!cmDef) return null

              const statusConfig = COUNTERMEASURE_STATUS_CONFIG[cm.status]
              const isAssigning = assigningOwnerFor === cm.id
              const isWaiving = waivingReasonFor === cm.id

              // Find user details if owner is set
              const ownerUser = cm.owner ? TEAM_MEMBERS.find((u) => u.email === cm.owner) : null

              return (
                <div key={cm.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusConfig.color }}
                      />
                      <div>
                        <div className="font-medium text-sm">{cmDef.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {cmDef.description}
                        </div>
                        {/* Standard badges - filtered by selected frameworks */}
                        {(() => {
                          const filteredStandards = cmDef.standards.filter(
                            (s) => selectedFrameworks.includes(s.standard)
                          )
                          if (filteredStandards.length === 0) return null
                          return (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {filteredStandards.map((s) => (
                                <span
                                  key={`${s.standard}-${s.reference}`}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                  title={SECURITY_STANDARDS[s.standard]?.description}
                                >
                                  {s.standard}
                                  {s.reference && (
                                    <span className="ml-0.5 text-slate-500">{s.reference}</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveCountermeasure(selectedComponentThreat.id, cm.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Owner display */}
                  {cm.owner && !isAssigning && (
                    <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ownerUser ? (
                        <span>{ownerUser.firstName} {ownerUser.lastName} ({ownerUser.email})</span>
                      ) : (
                        <span>{cm.owner}</span>
                      )}
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
                            const boundaryData = boundary.data as TrustBoundaryNodeData
                            return String(boundaryData.label || 'boundary')
                          })()}
                        </span>
                      </span>
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
                        onSelect={(user) => handleAssignOwner(cm.countermeasureId, user)}
                        onCancel={handleCancelAssignment}
                      />
                    </div>
                  ) : isWaiving ? (
                    <div className="mt-3">
                      <WaiverReasonInput
                        onSubmit={(reason) => handleWaiverSubmit(cm.countermeasureId, reason)}
                        onCancel={handleCancelWaiver}
                      />
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <CountermeasureStatusButtons
                        status={cm.status}
                        isPlatformLevel={cmDef.isPlatformLevel}
                        hasOwner={!!cm.owner}
                        onChange={(status) =>
                          onCountermeasureStatusChange(
                            selectedComponentThreat.id,
                            cm.countermeasureId,
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
            })}

            {/* Add countermeasure */}
            {selectedComponentThreat && availableCountermeasures.length > 0 && (
              <div className="pt-2 border-t">
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  onClick={() => {
                    // Add first available countermeasure for now
                    // Could expand to a dropdown/modal
                    if (availableCountermeasures[0]) {
                      onAddCustomCountermeasure(
                        selectedComponentThreat.id,
                        availableCountermeasures[0].id
                      )
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Custom Countermeasure
                </button>
              </div>
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
    </div>
  )
}
