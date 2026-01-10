import type { STRIDECategory } from '../lib/threat-registry'
import type { SecurityStandard } from '../lib/countermeasure-registry'

/**
 * Status of a countermeasure for a specific component-threat
 */
export type CountermeasureStatus = 'platform' | 'gap' | 'planned' | 'waived'

export const COUNTERMEASURE_STATUS_CONFIG: Record<
  CountermeasureStatus,
  { label: string; color: string; bgColor: string; description: string }
> = {
  platform: {
    label: 'Platform',
    color: '#22c55e', // green
    bgColor: 'bg-green-500',
    description: 'Handled at platform/infrastructure level',
  },
  gap: {
    label: 'Gap',
    color: '#ef4444', // red
    bgColor: 'bg-red-500',
    description: 'Not implemented, needs attention',
  },
  planned: {
    label: 'Planned',
    color: '#eab308', // yellow
    bgColor: 'bg-yellow-500',
    description: 'Implementation planned or in progress',
  },
  waived: {
    label: 'Waived',
    color: '#3b82f6', // blue
    bgColor: 'bg-blue-500',
    description: 'Risk accepted, not implementing',
  },
}

/**
 * Derived status for a threat based on its countermeasures
 */
export type ThreatStatus = 'exposed' | 'addressable' | 'mitigated'

export const THREAT_STATUS_CONFIG: Record<
  ThreatStatus,
  { label: string; color: string; bgColor: string; description: string }
> = {
  exposed: {
    label: 'exposed',
    color: '#ef4444', // red
    bgColor: 'bg-red-100 text-red-700',
    description: 'Threat has unaddressed countermeasures (gaps)',
  },
  addressable: {
    label: 'addressable',
    color: '#eab308', // yellow
    bgColor: 'bg-yellow-100 text-yellow-700',
    description: 'All countermeasures are planned, waived, or platform-level',
  },
  mitigated: {
    label: 'mitigated',
    color: '#22c55e', // green
    bgColor: 'bg-green-100 text-green-700',
    description: 'All countermeasures are implemented or platform-level',
  },
}

/**
 * A countermeasure instance for a specific component-threat pair
 * (Runtime state, references definitions from countermeasure-registry)
 */
export interface ComponentThreatCountermeasure {
  id: string
  // Reference to countermeasure definition
  countermeasureId: string
  // Reference to the component-threat this belongs to
  componentThreatId: string
  // Current status
  status: CountermeasureStatus
  // Owner (email or username)
  owner?: string
  // Notes or justification (especially for waived)
  notes?: string
  // If this countermeasure is provided by a trust boundary (for data flows)
  providedByBoundaryId?: string
  // Whether this countermeasure has been dismissed/removed
  dismissed?: boolean
  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * A threat instance for a specific component
 * (Runtime state, references definitions from threat-registry)
 */
export interface ComponentThreat {
  id: string
  // Reference to the diagram (for tracking which DFD this came from)
  diagramId: string
  // Source diagram info (for aggregated view)
  sourceDiagramId?: string
  sourceDiagramTitle?: string
  // Reference to the component (node ID from the DFD)
  componentId: string
  // Reference to threat definition
  threatId: string
  // Whether this threat was dismissed/hidden
  dismissed: boolean
  // Custom notes
  notes?: string
  // Countermeasures for this component-threat
  countermeasures: ComponentThreatCountermeasure[]
  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Summary of a component's threat status
 */
export interface ComponentThreatSummary {
  componentId: string
  componentLabel: string
  componentType: string
  technology?: string
  totalThreats: number
  exposedThreats: number
  addressableThreats: number
  mitigatedThreats: number
}

/**
 * Full threat analysis state for a diagram
 */
export interface ThreatAnalysis {
  diagramId: string
  componentThreats: ComponentThreat[]
  createdAt: string
  updatedAt: string
}

/**
 * Helper to derive threat status from its countermeasures
 */
export function deriveThreatStatus(countermeasures: ComponentThreatCountermeasure[]): ThreatStatus {
  if (countermeasures.length === 0) return 'exposed'

  const hasGaps = countermeasures.some((cm) => cm.status === 'gap')
  if (hasGaps) return 'exposed'

  const hasPlanned = countermeasures.some((cm) => cm.status === 'planned')
  const hasWaived = countermeasures.some((cm) => cm.status === 'waived')
  if (hasPlanned || hasWaived) return 'addressable'

  // All are 'platform' (no gaps, no planned, no waived)
  return 'mitigated'
}

/**
 * Helper to summarize a component's threat status
 */
export function summarizeComponentThreats(
  componentId: string,
  componentLabel: string,
  componentType: string,
  technology: string | undefined,
  threats: ComponentThreat[]
): ComponentThreatSummary {
  const componentThreats = threats.filter((t) => t.componentId === componentId && !t.dismissed)

  let exposed = 0
  let addressable = 0
  let mitigated = 0

  componentThreats.forEach((threat) => {
    const status = deriveThreatStatus(threat.countermeasures)
    if (status === 'exposed') exposed++
    else if (status === 'addressable') addressable++
    else mitigated++
  })

  return {
    componentId,
    componentLabel,
    componentType,
    technology,
    totalThreats: componentThreats.length,
    exposedThreats: exposed,
    addressableThreats: addressable,
    mitigatedThreats: mitigated,
  }
}

/**
 * Expanded component threat with resolved definitions
 * (For UI display - combines runtime state with library definitions)
 */
export interface ExpandedComponentThreat {
  id: string
  componentId: string
  componentLabel: string
  // Threat definition data
  threatId: string
  threatName: string
  threatDescription: string
  strideCategory: STRIDECategory
  // Status derived from countermeasures
  status: ThreatStatus
  dismissed: boolean
  notes?: string
  // Expanded countermeasures
  countermeasures: ExpandedCountermeasure[]
  createdAt: string
  updatedAt: string
}

/**
 * Expanded countermeasure with resolved definitions
 */
export interface ExpandedCountermeasure {
  id: string
  componentThreatId: string
  // Countermeasure definition data
  countermeasureId: string
  name: string
  description: string
  isPlatformLevel: boolean
  standards: { standard: SecurityStandard; reference?: string }[]
  // Runtime state
  status: CountermeasureStatus
  owner?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// ============================================
// Workspace Types (for aggregated threat analysis)
// ============================================

/**
 * Workspace status for threat model review workflow
 */
export type WorkspaceStatus = 'draft' | 'in_review' | 'approved' | 'archived'

export const WORKSPACE_STATUS_CONFIG: Record<
  WorkspaceStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: 'Draft', color: '#6b7280', bgColor: 'bg-gray-100 text-gray-700' },
  in_review: { label: 'In Review', color: '#f59e0b', bgColor: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', color: '#22c55e', bgColor: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', color: '#6b7280', bgColor: 'bg-gray-100 text-gray-500' },
}

/**
 * Version trigger types
 */
export type VersionTrigger =
  | 'initial'
  | 'incident'
  | 'new_feature'
  | 'architecture_change'
  | 'compliance_review'
  | 'periodic_review'
  | 'other'

export const VERSION_TRIGGER_CONFIG: Record<VersionTrigger, { label: string }> = {
  initial: { label: 'Initial' },
  incident: { label: 'Incident' },
  new_feature: { label: 'New Feature' },
  architecture_change: { label: 'Architecture Change' },
  compliance_review: { label: 'Compliance Review' },
  periodic_review: { label: 'Periodic Review' },
  other: { label: 'Other' },
}

/**
 * Version info for threat model
 */
export interface ThreatModelVersion {
  version: number
  trigger: VersionTrigger
  notes?: string
  createdAt: string
  createdBy?: string
}

/**
 * System context configuration
 */
export interface SystemContext {
  description?: string
  assets?: string[]
  outOfScopeItems?: string[]
  integrations?: {
    github?: boolean
    jira?: boolean
    cspm?: boolean
    sca?: boolean
  }
  uploads?: {
    prd?: string
    terraform?: string
  }
  scopeLocked: boolean
  scopeLockedAt?: string
}

/**
 * Team member reference
 */
export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  role?: string
}

/**
 * Progress checklist item
 */
export interface ProgressChecklistItem {
  id: string
  label: string
  checked: boolean
  autoComputed?: boolean // If true, computed from data rather than manual checkbox
}

/**
 * Default progress checklist items
 */
export const DEFAULT_PROGRESS_CHECKLIST: Omit<ProgressChecklistItem, 'checked'>[] = [
  { id: 'assets_defined', label: 'Primary assets defined', autoComputed: false },
  { id: 'components_identified', label: 'Components identified', autoComputed: true },
  { id: 'trust_boundaries_identified', label: 'Trust boundaries identified', autoComputed: true },
  { id: 'data_flows_defined', label: 'Data flows defined', autoComputed: true },
  { id: 'owners_assigned', label: 'Owners assigned', autoComputed: true },
  { id: 'threats_linked_components', label: 'Threats linked to components', autoComputed: true },
  { id: 'threats_linked_flows', label: 'Threats linked to flows', autoComputed: true },
  { id: 'countermeasures_assigned', label: 'Countermeasures assigned', autoComputed: true },
]

/**
 * Aggregated threat analysis state for a threat model (across all diagrams)
 */
export interface WorkspaceThreatAnalysis {
  threatModelId: string
  componentThreats: ComponentThreat[]
  status: WorkspaceStatus
  currentVersion: ThreatModelVersion
  previousVersions?: ThreatModelVersion[]
  systemContext: SystemContext
  progressChecklist: ProgressChecklistItem[]
  createdAt: string
  updatedAt: string
}
