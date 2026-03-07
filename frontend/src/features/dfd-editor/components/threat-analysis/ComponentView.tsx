import { Fragment, useState, useMemo, useCallback } from 'react'
import { Cog, Database, User, ChevronDown, ChevronUp, ChevronRight, X, Lock, LockOpen, Check, ChevronsUpDown, Plus, ArrowRight, Shield, Building2, Pencil } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useTeamMembers, useOrganizationMembers } from '@/api/organizations'
import type { TeamMembership, OrganizationMembership } from '@/types/organization'
import type { DiagramNode, DataFlowEdge, CanvasData, TrustZoneNodeData } from '../../types'
import { TRUST_ZONE_TYPE_CONFIG } from '../../types'
import type {
  ComponentThreat,
  CountermeasureStatus,
  ThreatStatus,
  ComplianceStandardMapping,
} from '../../types/threat-analysis'
import {
  deriveThreatStatus,
  COUNTERMEASURE_STATUS_CONFIG,
  THREAT_STATUS_CONFIG,
} from '../../types/threat-analysis'
import { STRIDE_CONFIG, type STRIDECategory } from '@/types/domain'
import { useComponentDataAssets } from '@/api/component-data-assets'
import { useDataFlowAssets } from '@/api/data-flow-assets'
import { TaxonomyBadges } from '@/components/shared/TaxonomyBadges'
import { EditComplianceMappingsDialog } from './EditComplianceMappingsDialog'
import { parseCountermeasureId } from '@/api/threats'
import {
  buildComponentTree,
  buildNodesMap,
  getAncestryPath,
  getDirectProcessChildren,
  type ComponentTreeNode,
} from './hierarchy-utils'

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  none: { label: 'None', color: 'bg-gray-100 text-gray-600' },
  low: { label: 'Low', color: 'bg-blue-100 text-blue-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
}

/** Assignee type for the combobox — individuals only */
export type Assignee = { type: 'member'; userId: number; email: string; name: string | null }

// Icon map for node types
const nodeTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  process: Cog,
  datastore: Database,
  humanActor: User,
  systemActor: Building2,
}

/**
 * Collapsible section header for the assignee selector
 */
function SectionHeader({
  icon: Icon,
  label,
  count,
  isOpen,
  onClick,
  hasBorderTop = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  isOpen: boolean
  onClick: () => void
  hasBorderTop?: boolean
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center justify-between px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent',
        hasBorderTop && 'border-t'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {count}
        </Badge>
      </div>
      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
  )
}

/**
 * Searchable user/team dropdown component with collapsible sections
 */
function UserSearchCombobox({
  value,
  onSelect,
  onCancel,
}: {
  value: string
  onSelect: (assignee: Assignee) => void
  onCancel: () => void
}) {
  const [open, setOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [teamMembersOpen, setTeamMembersOpen] = useState(true)
  const [orgMembersOpen, setOrgMembersOpen] = useState(false)

  // Get current workspace context
  const { currentTeam, currentOrganization } = useWorkspace()

  // Fetch real data
  const { data: teamMembers = [], isLoading: teamMembersLoading } = useTeamMembers(
    currentTeam?.id ?? 0
  )
  const { data: orgMembers = [], isLoading: orgMembersLoading } = useOrganizationMembers(
    currentOrganization?.id ?? 0
  )

  // Filter org members to exclude those already in the current team
  const teamMemberEmails = new Set(teamMembers.map((m) => m.userEmail))
  const otherOrgMembers = orgMembers.filter((m) => !teamMemberEmails.has(m.userEmail))

  // Find selected display value
  const selectedTeamMember = teamMembers.find((m) => m.userEmail === value)
  const selectedOrgMember = orgMembers.find((m) => m.userEmail === value)
  const selectedName = selectedTeamMember?.userName ?? selectedOrgMember?.userEmail ?? value

  // Filter functions
  const filterTeamMember = (member: TeamMembership) => {
    const searchLower = search.toLowerCase()
    return (
      member.userName.toLowerCase().includes(searchLower) ||
      member.userEmail.toLowerCase().includes(searchLower)
    )
  }

  const filterOrgMember = (member: OrganizationMembership) => {
    const searchLower = search.toLowerCase()
    return member.userEmail.toLowerCase().includes(searchLower)
  }

  const filteredTeamMembers = teamMembers.filter(filterTeamMember)
  const filteredOrgMembers = otherOrgMembers.filter(filterOrgMember)

  const isLoading = teamMembersLoading || orgMembersLoading
  const hasNoResults =
    !isLoading &&
    filteredTeamMembers.length === 0 &&
    filteredOrgMembers.length === 0

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
            {value ? (
              <span className="truncate">{selectedName}</span>
            ) : (
              <span className="text-muted-foreground">Select team member...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search by name or email..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[300px]">
              {isLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              )}
              {hasNoResults && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}

              {/* Team Members Section */}
              {filteredTeamMembers.length > 0 && (
                <div>
                  <SectionHeader
                    icon={User}
                    label="Team Members"
                    count={filteredTeamMembers.length}
                    isOpen={teamMembersOpen}
                    onClick={() => setTeamMembersOpen(!teamMembersOpen)}
                  />
                  {teamMembersOpen && (
                    <CommandGroup>
                      {filteredTeamMembers.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={`member-${member.userEmail}`}
                          onSelect={() => {
                            onSelect({ type: 'member', userId: member.user, email: member.userEmail, name: member.userName })
                            setOpen(false)
                          }}
                          className="flex items-center gap-2 py-2"
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 flex-shrink-0',
                              value === member.userEmail ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {member.userName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {member.userEmail}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </div>
              )}

              {/* Org Members Section */}
              {filteredOrgMembers.length > 0 && (
                <div>
                  <SectionHeader
                    icon={Building2}
                    label="Org Members"
                    count={filteredOrgMembers.length}
                    isOpen={orgMembersOpen}
                    onClick={() => setOrgMembersOpen(!orgMembersOpen)}
                    hasBorderTop
                  />
                  {orgMembersOpen && (
                    <CommandGroup>
                      {filteredOrgMembers.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={`org-${member.userEmail}`}
                          onSelect={() => {
                            onSelect({ type: 'member', userId: member.user, email: member.userEmail, name: null })
                            setOpen(false)
                          }}
                          className="flex items-center gap-2 py-2"
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 flex-shrink-0',
                              value === member.userEmail ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {member.userEmail}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8 flex-1"
          disabled={!value}
          onClick={() => {
            if (selectedTeamMember) {
              onSelect({ type: 'member', userId: selectedTeamMember.user, email: selectedTeamMember.userEmail, name: selectedTeamMember.userName })
            } else if (selectedOrgMember) {
              onSelect({ type: 'member', userId: selectedOrgMember.user, email: selectedOrgMember.userEmail, name: null })
            }
          }}
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

/**
 * Compliance badge showing framework and section code
 */
function ComplianceBadge({
  frameworkName,
  sectionCode,
  sufficiency
}: {
  frameworkName: string
  sectionCode: string
  sufficiency: 'full' | 'partial'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
        sufficiency === 'full'
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      )}
      title={`${sufficiency === 'full' ? 'Fully' : 'Partially'} addresses ${frameworkName} ${sectionCode}`}
    >
      {frameworkName && <span className="mr-0.5">{frameworkName}</span>}
      <span>{sectionCode}</span>
      {sufficiency === 'partial' && <span className="ml-0.5 opacity-70">(partial)</span>}
    </span>
  )
}

/**
 * Expandable compliance detail section for countermeasures
 */
function ComplianceDetailSection({
  mappings,
  isExpanded,
  onToggle,
  onEdit,
}: {
  mappings: ComplianceStandardMapping[]
  isExpanded: boolean
  onToggle: () => void
  onEdit?: () => void
}) {
  if (mappings.length === 0) return null

  const groupedByFramework = mappings.reduce((acc, mapping) => {
    if (!acc[mapping.frameworkName]) {
      acc[mapping.frameworkName] = []
    }
    acc[mapping.frameworkName].push(mapping)
    return acc
  }, {} as Record<string, ComplianceStandardMapping[]>)

  return (
    <div className="mt-2 pt-2 border-t">
      <div className="flex items-center justify-between">
        <button
          className="flex-1 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground"
          onClick={onToggle}
        >
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            <span className="font-medium">Compliance Coverage</span>
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              {mappings.length}
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            title="Edit compliance mappings"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {Object.entries(groupedByFramework).map(([framework, fwMappings]) => (
            <div key={framework} className="pl-2 border-l-2 border-slate-200">
              <div className="text-xs font-medium text-slate-600 mb-1">{framework}</div>
              <div className="space-y-1">
                {fwMappings.map((mapping) => (
                  <div key={mapping.id} className="flex items-start gap-2 text-xs">
                    <ComplianceBadge
                      frameworkName=""
                      sectionCode={mapping.sectionCode}
                      sufficiency={mapping.sufficiency}
                    />
                    <span className="text-muted-foreground flex-1 line-clamp-2">
                      {mapping.requirementDescription}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
  onAddCustomThreat: () => void
  onDismissThreat: (componentThreatId: string) => void
  onRestoreThreat: (componentThreatId: string) => void
  onAddCustomCountermeasure: () => void
  onRemoveCountermeasure: (componentThreatId: string, countermeasureInstanceId: string) => void
  onRestoreCountermeasure: (componentThreatId: string, countermeasureInstanceId: string) => void
  onCountermeasurePriorityChange: (
    componentThreatId: string,
    countermeasureInstanceId: string,
    priority: string
  ) => void
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
 * Single item in the component tree (left panel).
 * Renders the node with indentation based on depth, an expand/collapse chevron
 * for parents, and the existing threat summary badges.
 */
function ComponentTreeItem({
  treeNode,
  componentThreats,
  selectedComponentId,
  collapsedNodes,
  onSelectComponent,
  onToggleCollapsed,
}: {
  treeNode: ComponentTreeNode
  componentThreats: ComponentThreat[]
  selectedComponentId: string | null
  collapsedNodes: Set<string>
  onSelectComponent: (id: string) => void
  onToggleCollapsed: (id: string) => void
}) {
  const { node, children, depth } = treeNode
  const Icon = nodeTypeIcons[node.type as string] || Cog
  const summary = getComponentThreatSummary(node.id, componentThreats)
  const isSelected = node.id === selectedComponentId
  const technologyName = (node.data as { technology?: string }).technology
  const nodeLabel = String(node.data.label)
  const displayName = technologyName || nodeLabel
  const showSecondaryLabel = technologyName && nodeLabel !== technologyName && !nodeLabel.toLowerCase().includes('new ')
  const hasChildren = children.length > 0
  const isCollapsed = collapsedNodes.has(node.id)

  return (
    <>
      <button
        onClick={() => onSelectComponent(node.id)}
        className={cn(
          'w-full text-left p-2 rounded-md transition-colors',
          isSelected
            ? 'bg-slate-100 border border-slate-300'
            : 'hover:bg-slate-50'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Chevron for parents, spacer for leaves */}
            {hasChildren ? (
              <span
                role="button"
                className="flex-shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleCollapsed(node.id)
                }}
              >
                <ChevronRight
                  className={cn(
                    'h-3 w-3 text-muted-foreground transition-transform',
                    !isCollapsed && 'rotate-90'
                  )}
                />
              </span>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">
                {displayName}
              </div>
              {showSecondaryLabel && (
                <div className="text-xs text-muted-foreground truncate">
                  {nodeLabel}
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
          <div className="flex items-center gap-1 mt-1" style={{ marginLeft: `${hasChildren ? 24 : 20}px` }}>
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
      {/* Data assets inline under selected component */}
      {isSelected && (
        <ComponentDataAssetsDisplay
          componentId={(node.data as { componentId?: number }).componentId}
        />
      )}
      {/* Recursively render children when not collapsed */}
      {hasChildren && !isCollapsed && children.map((child) => (
        <ComponentTreeItem
          key={child.node.id}
          treeNode={child}
          componentThreats={componentThreats}
          selectedComponentId={selectedComponentId}
          collapsedNodes={collapsedNodes}
          onSelectComponent={onSelectComponent}
          onToggleCollapsed={onToggleCollapsed}
        />
      ))}
    </>
  )
}

/**
 * Read-only display of data assets linked to a component (inline under sidebar item)
 */
function ComponentDataAssetsDisplay({
  componentId,
}: {
  componentId: number | undefined
}) {
  const [collapsed, setCollapsed] = useState(false)
  const { data: componentDataAssets = [] } = useComponentDataAssets(componentId)

  if (!componentId || componentDataAssets.length === 0) return null

  return (
    <div className="ml-6 mt-1 mb-1">
      <button
        className="w-full flex items-center justify-between text-xs"
        onClick={(e) => {
          e.stopPropagation()
          setCollapsed(!collapsed)
        }}
      >
        <div className="flex items-center gap-1.5">
          <Database className="h-3 w-3 text-purple-600" />
          <span className="font-medium text-muted-foreground">Data Assets</span>
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {componentDataAssets.length}
          </Badge>
        </div>
        {collapsed ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      {!collapsed && (
        <div className="mt-1.5 space-y-1">
          {componentDataAssets.map((cda) => (
            <div
              key={cda.id}
              className="flex items-center gap-2 py-1 text-xs"
            >
              {cda.encrypted ? (
                <Lock className="h-3 w-3 text-green-600 flex-shrink-0" />
              ) : (
                <LockOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate flex-1">{cda.dataAssetName}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1 flex-shrink-0">
                {cda.dataState === 'at_rest' ? 'At Rest' : 'Processed'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Read-only display of data assets linked to a data flow (inline under sidebar item)
 */
function DataFlowAssetsDisplay({
  dataFlowId,
}: {
  dataFlowId: number | undefined
}) {
  const [collapsed, setCollapsed] = useState(false)
  const { data: flowDataAssets = [] } = useDataFlowAssets(dataFlowId)

  if (!dataFlowId || flowDataAssets.length === 0) return null

  const protectionLabels: Record<string, string> = {
    encrypted: 'Encrypted',
    masked: 'Masked',
    tokenized: 'Tokenized',
    hashed: 'Hashed',
    none: 'None',
  }

  return (
    <div className="ml-6 mt-1 mb-1">
      <button
        className="w-full flex items-center justify-between text-xs"
        onClick={(e) => {
          e.stopPropagation()
          setCollapsed(!collapsed)
        }}
      >
        <div className="flex items-center gap-1.5">
          <Database className="h-3 w-3 text-purple-600" />
          <span className="font-medium text-muted-foreground">Data Assets</span>
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {flowDataAssets.length}
          </Badge>
        </div>
        {collapsed ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      {!collapsed && (
        <div className="mt-1.5 space-y-1">
          {flowDataAssets.map((fda) => (
            <div
              key={fda.id}
              className="flex items-center gap-2 py-1 text-xs"
            >
              {fda.protectionMethod === 'encrypted' ? (
                <Lock className="h-3 w-3 text-green-600 flex-shrink-0" />
              ) : (
                <LockOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate flex-1">{fda.dataAssetName}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1 flex-shrink-0">
                {protectionLabels[fda.protectionMethod] || fda.protectionMethod}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
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
  const statuses: CountermeasureStatus[] = ['gap', 'planned', 'verified', 'waived']

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
              isActive && s === 'verified' && 'bg-green-500 hover:bg-green-600',
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
  threatModelId,
  canvasData,
  analyzableComponents,
  trustZones,
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
  onAddCustomThreat,
  onDismissThreat,
  onRestoreThreat,
  onAddCustomCountermeasure,
  onRemoveCountermeasure,
  onRestoreCountermeasure,
  onCountermeasurePriorityChange,
}: ComponentViewProps) {
  const [showDismissedThreats, setShowDismissedThreats] = useState(false)
  const [showDismissedCountermeasures, setShowDismissedCountermeasures] = useState(false)
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

  const activeThreats = threatsForComponent.filter((t) => !t.dismissed)
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

  // Total countermeasures count
  const totalCountermeasures = selectedComponentThreat?.countermeasures.length || 0
  const resolvedCountermeasures = selectedComponentThreat?.countermeasures.filter(
    (cm) => cm.status !== 'gap'
  ).length || 0

  return (
    <div className="flex h-full">
      {/* Column 1: Components */}
      <div className="w-64 border-r flex flex-col">
        {/* Components list header */}
        <div className="px-3 py-2 border-b">
          <div className="font-medium">Components & Zones</div>
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
                  const technologyName = (node.data as { technology?: string }).technology
                  const nodeLabel = String(node.data.label)
                  const displayName = technologyName || nodeLabel
                  const showSecondaryLabel = technologyName && nodeLabel !== technologyName && !nodeLabel.toLowerCase().includes('new ')

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
                                  {nodeLabel}
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
                  const zoneConfig = zoneData.zoneType
                    ? TRUST_ZONE_TYPE_CONFIG[zoneData.zoneType]
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
                            style={{ color: zoneConfig?.borderColor || '#64748b' }}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {String(node.data.label)}
                            </div>
                            {zoneConfig && (
                              <div className="text-xs text-muted-foreground truncate">
                                {zoneConfig.label}
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

      {/* Column 2: Threats */}
      <div className="w-96 border-r flex flex-col">
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
                const ancestorLabel =
                  (ancestor.data as { technology?: string }).technology || String(ancestor.data.label)
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
              ? (selectedComponent.data as { technology?: string }).technology || String(selectedComponent.data.label)
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
                const childLabel =
                  (child.data as { technology?: string }).technology || String(child.data.label)
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

                {activeThreats.map((ct) => {
                  // Use threat metadata from backend (stored in ComponentThreat)
                  if (!ct.threatName) return null

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
                            {ct.threatName}
                          </span>
                        </div>
                        {isSelected ? (
                          <div className="mt-1 ml-4">
                            <TaxonomyBadges entries={ct.taxonomyEntries} size="sm" />
                          </div>
                        ) : (
                          <div className="mt-1 ml-4">
                            {(() => {
                              const strideEntry = ct.taxonomyEntries?.find((e) => e.taxonomySlug === 'stride')
                              if (!strideEntry) return null
                              const strideConfig = STRIDE_CONFIG[strideEntry.externalId as STRIDECategory]
                              return strideConfig ? (
                                <span
                                  className="text-[10px] font-medium"
                                  style={{ color: strideConfig.color }}
                                >
                                  {strideConfig.label}
                                </span>
                              ) : null
                            })()}
                          </div>
                        )}
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
                            {(() => {
                              const strideEntry = ct.taxonomyEntries?.find((e) => e.taxonomySlug === 'stride')
                              if (!strideEntry) return null
                              const strideConfig = STRIDE_CONFIG[strideEntry.externalId as STRIDECategory]
                              return strideConfig ? (
                                <span
                                  className="text-[10px] text-muted-foreground"
                                >
                                  {strideConfig.label}
                                </span>
                              ) : null
                            })()}
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
              {selectedThreatDef?.threatName || 'Select a threat'}
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
            {/* Active countermeasures */}
            {selectedComponentThreat?.countermeasures
              .filter((cm) => !cm.dismissed)
              .map((cm) => {
                const cmName = cm.countermeasureName || cm.countermeasureId
                const cmDescription = cm.countermeasureDescription

                const statusConfig = COUNTERMEASURE_STATUS_CONFIG[cm.status]
                const isAssigning = assigningOwnerFor === cm.id
                const isWaiving = waivingReasonFor === cm.id

                return (
                  <div key={cm.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveCountermeasure(selectedComponentThreat.id, cm.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Compliance mappings - expandable detail */}
                    {cm.standardMappings && cm.standardMappings.length > 0 ? (
                      <ComplianceDetailSection
                        mappings={cm.standardMappings}
                        isExpanded={expandedComplianceFor.has(cm.id)}
                        onToggle={() => toggleComplianceExpanded(cm.id)}
                        onEdit={() => {
                          const parsed = parseCountermeasureId(cm.id)
                          if (parsed) {
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
                          if (parsed) {
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
                            value
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
              })}

            {/* Add countermeasure */}
            {selectedComponentThreat && (
              <div className="pt-2 border-t">
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  onClick={onAddCustomCountermeasure}
                >
                  <Plus className="h-4 w-4" />
                  Add Countermeasure
                </button>
              </div>
            )}

            {/* Dismissed countermeasures section */}
            {selectedComponentThreat && (() => {
              const dismissedCms = selectedComponentThreat.countermeasures.filter((cm) => cm.dismissed)
              if (dismissedCms.length === 0) return null
              return (
                <div className="mt-4 pt-3 border-t">
                  <button
                    className="w-full flex items-center justify-between px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setShowDismissedCountermeasures(!showDismissedCountermeasures)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Dismissed</span>
                      <Badge variant="outline" className="text-xs bg-slate-100">
                        {dismissedCms.length}
                      </Badge>
                    </div>
                    {showDismissedCountermeasures ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {showDismissedCountermeasures && (
                    <div className="mt-2 space-y-2">
                      {dismissedCms.map((cm) => {
                        const cmName = cm.countermeasureName || cm.countermeasureId

                        return (
                          <div
                            key={cm.id}
                            className="flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-slate-50 border"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-muted-foreground line-through truncate block">
                                {cmName}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => onRestoreCountermeasure(selectedComponentThreat.id, cm.id)}
                            >
                              Restore
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
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
