import { useState, useMemo } from 'react'
import { Cog, Database, User, ChevronDown, ChevronUp, Plus, X, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { DiagramNode, CanvasData } from '../../types'
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
  THREAT_DEFINITIONS,
  STRIDE_CONFIG,
  type STRIDECategory,
} from '../../lib/threat-registry'
import {
  getCountermeasureById,
  getCountermeasuresForThreat,
} from '../../lib/countermeasure-registry'
import { getTechnologyById } from '../../lib/technology-registry'

// Icon map for node types
const nodeTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  process: Cog,
  datastore: Database,
  actor: User,
}

interface ComponentViewProps {
  canvasData: CanvasData
  componentsWithThreats: DiagramNode[]
  componentThreats: ComponentThreat[]
  selectedComponentId: string | null
  selectedThreatId: string | null
  selectedComponentThreat: ComponentThreat | null
  onSelectComponent: (componentId: string) => void
  onSelectThreat: (threatId: string) => void
  onCountermeasureStatusChange: (
    componentThreatId: string,
    countermeasureId: string,
    status: CountermeasureStatus
  ) => void
  onAssignOwner: (
    componentThreatId: string,
    countermeasureId: string,
    owner: string
  ) => void
  onAddCustomThreat: (componentId: string, threatId: string) => void
  onDismissThreat: (componentThreatId: string) => void
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
  onChange,
}: {
  status: CountermeasureStatus
  isPlatformLevel: boolean
  onChange: (status: CountermeasureStatus) => void
}) {
  const statuses: CountermeasureStatus[] = ['gap', 'planned', 'waived']

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
            onClick={() => onChange(s)}
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
  componentsWithThreats,
  componentThreats,
  selectedComponentId,
  selectedThreatId,
  selectedComponentThreat,
  onSelectComponent,
  onSelectThreat,
  onCountermeasureStatusChange,
  onAssignOwner,
  onAddCustomThreat,
  onDismissThreat: _onDismissThreat,
  onAddCustomCountermeasure,
  onRemoveCountermeasure,
}: ComponentViewProps) {
  // Mark as used - functionality will be added
  void _onDismissThreat
  const [showSuggested, setShowSuggested] = useState(true)
  const [showDismissed, setShowDismissed] = useState(false)
  const [assigningOwner, setAssigningOwner] = useState<string | null>(null)
  const [ownerInput, setOwnerInput] = useState('')

  // Get selected component
  const selectedComponent = useMemo(() => {
    if (!selectedComponentId) return null
    return canvasData.nodes.find((n) => n.id === selectedComponentId) || null
  }, [canvasData.nodes, selectedComponentId])

  // Get threats for selected component
  const threatsForComponent = useMemo(() => {
    if (!selectedComponentId) return []
    return componentThreats.filter((ct) => ct.componentId === selectedComponentId)
  }, [componentThreats, selectedComponentId])

  const activeThreats = threatsForComponent.filter((t) => !t.dismissed)
  const dismissedThreats = threatsForComponent.filter((t) => t.dismissed)

  // Get suggested threats (threats from library not yet added)
  const suggestedThreats = useMemo(() => {
    if (!selectedComponent) return []

    const techId = (selectedComponent.data as { technology?: string }).technology
    if (!techId) return []

    const tech = getTechnologyById(techId)
    if (!tech) return []

    const existingThreatIds = new Set(
      threatsForComponent.map((ct) => ct.threatId)
    )

    return THREAT_DEFINITIONS.filter(
      (threat) =>
        threat.applicableTechCategories.includes(tech.category) &&
        !existingThreatIds.has(threat.id)
    )
  }, [selectedComponent, threatsForComponent])

  // Group suggested by STRIDE category
  const suggestedBySTRIDE = useMemo(() => {
    const groups: Record<STRIDECategory, typeof THREAT_DEFINITIONS> = {
      spoofing: [],
      tampering: [],
      repudiation: [],
      information_disclosure: [],
      denial_of_service: [],
      elevation_of_privilege: [],
    }

    suggestedThreats.forEach((threat) => {
      groups[threat.strideCategory].push(threat)
    })

    return groups
  }, [suggestedThreats])

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

  // Handle owner assignment
  const handleAssign = (countermeasureId: string) => {
    if (selectedComponentThreat && ownerInput.trim()) {
      onAssignOwner(selectedComponentThreat.id, countermeasureId, ownerInput.trim())
      setAssigningOwner(null)
      setOwnerInput('')
    }
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
        {/* Mini-map placeholder */}
        <div className="p-3 border-b">
          <div className="aspect-video bg-slate-100 rounded-md flex items-center justify-center text-xs text-muted-foreground">
            DFD Preview
          </div>
        </div>

        {/* Components list header */}
        <div className="px-3 py-2 border-b">
          <div className="font-medium">Components</div>
          <div className="text-xs text-muted-foreground">
            {componentsWithThreats.length} components &nbsp;|&nbsp;{' '}
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
            {componentsWithThreats.map((node) => {
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
          </div>
        </ScrollArea>
      </div>

      {/* Column 2: Threats */}
      <div className="w-72 border-r flex flex-col">
        <div className="px-3 py-2 border-b">
          <div className="font-medium">Threats</div>
          <div className="text-xs text-muted-foreground">
            {selectedComponent ? String(selectedComponent.data.label) : 'Select a component'}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Active threats */}
            {activeThreats.map((ct) => {
              const threatDef = getThreatById(ct.threatId)
              if (!threatDef) return null

              const status = deriveThreatStatus(ct.countermeasures)
              const isSelected = ct.id === selectedThreatId

              return (
                <button
                  key={ct.id}
                  onClick={() => onSelectThreat(ct.id)}
                  className={cn(
                    'w-full text-left p-2 rounded-md transition-colors',
                    isSelected
                      ? 'bg-slate-100 border border-slate-300'
                      : 'hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: THREAT_STATUS_CONFIG[status].color }}
                      />
                      <span className="font-medium text-sm truncate">
                        {threatDef.name}
                      </span>
                    </div>
                    <ThreatStatusBadge status={status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 ml-4">
                    {STRIDE_CONFIG[threatDef.strideCategory].label}
                  </div>
                </button>
              )
            })}

            {/* Add custom threat */}
            {selectedComponentId && (
              <div className="pt-2 border-t mt-2">
                <button
                  className="w-full text-left p-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  onClick={() => setShowSuggested(!showSuggested)}
                >
                  <Plus className="h-4 w-4" />
                  Add Custom Threat
                </button>

                {/* Suggested threats */}
                {suggestedThreats.length > 0 && (
                  <div className="mt-2">
                    <button
                      className="w-full flex items-center justify-between px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSuggested(!showSuggested)}
                    >
                      <span>Suggested ({suggestedThreats.length})</span>
                      {showSuggested ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {showSuggested && (
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(suggestedBySTRIDE).map(([category, threats]) => {
                          if (threats.length === 0) return null
                          const strideConfig = STRIDE_CONFIG[category as STRIDECategory]
                          return threats.map((threat) => (
                            <button
                              key={threat.id}
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50 rounded"
                              onClick={() => onAddCustomThreat(selectedComponentId, threat.id)}
                            >
                              <span className="text-muted-foreground">
                                {strideConfig.label}:
                              </span>{' '}
                              {threat.name}
                            </button>
                          ))
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Dismissed threats */}
                {dismissedThreats.length > 0 && (
                  <div className="mt-2">
                    <button
                      className="w-full flex items-center justify-between px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowDismissed(!showDismissed)}
                    >
                      <span>Show dismissed ({dismissedThreats.length})</span>
                      {showDismissed ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
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
              const isAssigning = assigningOwner === cm.id

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

                  {/* Owner display / assignment */}
                  {cm.owner && !isAssigning && (
                    <div className="mt-2 text-xs text-blue-600">
                      Owner: {cm.owner}
                    </div>
                  )}

                  {isAssigning ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={ownerInput}
                        onChange={(e) => setOwnerInput(e.target.value)}
                        placeholder="email@example.com"
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAssign(cm.countermeasureId)
                          if (e.key === 'Escape') {
                            setAssigningOwner(null)
                            setOwnerInput('')
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => handleAssign(cm.countermeasureId)}
                      >
                        Assign
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setAssigningOwner(null)
                          setOwnerInput('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <CountermeasureStatusButtons
                        status={cm.status}
                        isPlatformLevel={cmDef.isPlatformLevel}
                        onChange={(status) =>
                          onCountermeasureStatusChange(
                            selectedComponentThreat.id,
                            cm.countermeasureId,
                            status
                          )
                        }
                      />
                      {!cm.owner && cm.status !== 'platform' && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => {
                            setAssigningOwner(cm.id)
                            setOwnerInput('')
                          }}
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
