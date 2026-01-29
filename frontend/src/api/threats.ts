/**
 * API hooks for threat workflow endpoints.
 */

import { useQuery, useMutation, useQueryClient, skipToken } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ComponentThreat, ComponentThreatCountermeasure } from '@/features/dfd-editor/types/threat-analysis'
import type { STRIDECategory } from '@/types/domain'

// Backend countermeasure status (uses 'verified', differs from frontend 'platform')
type BackendCountermeasureStatus = 'gap' | 'planned' | 'verified' | 'waived'

// Types
export interface ComponentInstanceThreat {
  id: number
  component: number
  componentName: string
  threatLibrary: number
  threatName: string
  strideCategory: STRIDECategory
  inherentSeverity: string
  residualSeverity: string
  status: 'open' | 'mitigated' | 'accepted'
  justification: string
  createdAt: string
  updatedAt: string
}

export interface CountermeasureLibraryItem {
  id: number
  name: string
  controlType: string
  cost: string
  sourcePackName: string | null
  sourcePackSlug: string | null
}

export interface ComponentInstanceCountermeasure {
  id: number
  instanceThreat: number
  countermeasureLibrary: number
  countermeasureName: string
  status: BackendCountermeasureStatus
  verifiedBy: number | null
  verifiedByEmail: string | null
  evidenceUrl: string
  requiredForRelease: boolean
  assignedOwner: number | null
  assignedOwnerEmail: string | null
  createdAt: string
  updatedAt: string
}

export interface GenerateThreatsResponse {
  created: ComponentInstanceThreat[]
  existing: ComponentInstanceThreat[]
  createdCount: number
  existingCount: number
  total: number
  message: string
}

export interface SuggestedCountermeasuresResponse {
  threatId: number
  threatName: string
  suggested: CountermeasureLibraryItem[]
  applied: CountermeasureLibraryItem[]
  suggestedCount: number
  appliedCount: number
}

export interface ApplyCountermeasureResponse {
  countermeasure: ComponentInstanceCountermeasure
  message: string
}

export interface RecalculateStatusResponse {
  threatId: number
  oldStatus: string
  newStatus: string
  message: string
}

// Query keys
export const threatKeys = {
  all: ['threats'] as const,
  componentThreats: (componentId: number) => [...threatKeys.all, 'component', componentId] as const,
  threatCountermeasures: (threatId: number) => [...threatKeys.all, 'countermeasures', threatId] as const,
  suggestedCountermeasures: (threatId: number) => [...threatKeys.all, 'suggested', threatId] as const,
}

// Query Hooks

/**
 * Fetch threats for a specific component.
 */
export function useComponentThreats(componentId: number | null) {
  return useQuery({
    queryKey: threatKeys.componentThreats(componentId!),
    queryFn: async () => {
      const response = await api.get<{ results: ComponentInstanceThreat[] } | ComponentInstanceThreat[]>(
        `/component-threats/?component=${componentId}`
      )
      return Array.isArray(response) ? response : response.results
    },
    enabled: componentId !== null,
  })
}

/**
 * Fetch suggested countermeasures for a threat instance.
 */
export function useSuggestedCountermeasures(threatId: number | null) {
  return useQuery({
    queryKey: threatKeys.suggestedCountermeasures(threatId!),
    queryFn: () => api.get<SuggestedCountermeasuresResponse>(
      `/component-threats/${threatId}/suggested_countermeasures/`
    ),
    enabled: threatId !== null,
  })
}

// Mutation Hooks

/**
 * Generate threats for a component based on its library type.
 */
export function useGenerateThreats() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (componentId: number) =>
      api.post<GenerateThreatsResponse>(`/components/${componentId}/generate_threats/`),
    onSuccess: (_, componentId) => {
      queryClient.invalidateQueries({ queryKey: threatKeys.componentThreats(componentId) })
      queryClient.invalidateQueries({ queryKey: threatKeys.all })
    },
  })
}

/**
 * Apply a countermeasure to a threat instance.
 */
export function useApplyCountermeasure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      threatId,
      countermeasureLibraryId,
      status,
    }: {
      threatId: number
      countermeasureLibraryId: number
      status?: string
    }) =>
      api.post<ApplyCountermeasureResponse>(`/component-threats/${threatId}/apply_countermeasure/`, {
        countermeasureLibraryId: countermeasureLibraryId,
        ...(status && { status }),
      }),
    onSuccess: (_, { threatId }) => {
      queryClient.invalidateQueries({ queryKey: threatKeys.suggestedCountermeasures(threatId) })
      queryClient.invalidateQueries({ queryKey: threatKeys.all })
    },
  })
}

/**
 * Recalculate threat status based on countermeasures.
 */
export function useRecalculateThreatStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (threatId: number) =>
      api.post<RecalculateStatusResponse>(`/component-threats/${threatId}/recalculate_status/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threatKeys.all })
    },
  })
}

/**
 * Update a threat instance (e.g., status, justification).
 */
export function useUpdateThreat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      threatId,
      data,
    }: {
      threatId: number
      data: Partial<ComponentInstanceThreat>
    }) => api.patch<ComponentInstanceThreat>(`/component-threats/${threatId}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threatKeys.all })
    },
  })
}

/**
 * Update a component countermeasure instance (e.g., status, evidenceUrl).
 */
export function useUpdateCountermeasure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      countermeasureId,
      data,
    }: {
      countermeasureId: number
      data: Partial<ComponentInstanceCountermeasure>
    }) => {
      return api.patch<ComponentInstanceCountermeasure>(
        `/component-countermeasures/${countermeasureId}/`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threatKeys.all })
      queryClient.invalidateQueries({ queryKey: ['threat-model-threats'] })
    },
  })
}

/**
 * Update a flow countermeasure instance (e.g., status, evidenceUrl).
 */
export function useUpdateFlowCountermeasure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      countermeasureId,
      data,
    }: {
      countermeasureId: number
      data: Partial<ComponentInstanceCountermeasure>
    }) => {
      return api.patch<ComponentInstanceCountermeasure>(
        `/flow-countermeasures/${countermeasureId}/`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threatKeys.all })
      queryClient.invalidateQueries({ queryKey: ['threat-model-threats'] })
    },
  })
}

/**
 * Parse a countermeasure ID string to determine type and numeric ID.
 * Returns null if the ID format is not recognized.
 *
 * ID formats:
 * - "cm-123" -> component countermeasure with ID 123
 * - "fcm-123" -> flow countermeasure with ID 123
 * - "ctcm-..." -> local countermeasure (not backend)
 */
export function parseCountermeasureId(idString: string): {
  type: 'component' | 'flow' | 'local'
  id: number | null
} {
  if (idString.startsWith('cm-')) {
    const numId = parseInt(idString.slice(3), 10)
    return { type: 'component', id: isNaN(numId) ? null : numId }
  }
  if (idString.startsWith('fcm-')) {
    const numId = parseInt(idString.slice(4), 10)
    return { type: 'flow', id: isNaN(numId) ? null : numId }
  }
  if (idString.startsWith('ctcm-')) {
    return { type: 'local', id: null }
  }
  return { type: 'local', id: null }
}

// ============================================
// Threat Model Threats API
// ============================================

/**
 * Backend response for threat model threats endpoint.
 */
export interface ThreatModelThreatsResponse {
  threatModelId: string
  threats: BackendThreat[]
  totalCount: number
  nodeComponentMap: Record<string, { componentId: number; dfdId: string; dfdName: string }>
}

/**
 * Backend threat format.
 */
export interface BackendThreat {
  id: number
  type: 'component' | 'dataflow'
  componentId: number
  componentName: string | null
  nodeId: string | null
  edgeId?: string | null
  dataflowId?: number
  dataflowLabel?: string | null
  dfdId: string | null
  dfdName: string | null
  threatLibraryId: number
  threatName: string | null
  threatDescription: string | null
  strideCategory: STRIDECategory | null
  inherentSeverity: string
  residualSeverity: string
  status: 'open' | 'mitigated' | 'accepted'
  justification: string
  countermeasures: BackendCountermeasure[]
}

/**
 * Backend standard mapping format.
 */
export interface BackendStandardMapping {
  id: number
  frameworkName: string
  frameworkSlug: string
  sectionCode: string
  requirementDescription: string
  sufficiency: 'full' | 'partial'
}

/**
 * Backend countermeasure format.
 */
export interface BackendCountermeasure {
  id: number
  countermeasureLibraryId: number
  countermeasureName: string | null
  controlType: string | null
  status: BackendCountermeasureStatus
  evidenceUrl: string
  assignedOwnerEmail: string | null
  verifiedByEmail: string | null
  standardMappings: BackendStandardMapping[]
}

/**
 * Transform backend countermeasure status to frontend format.
 * Backend uses 'verified', frontend uses 'platform' for implemented countermeasures.
 */
function transformCountermeasureStatus(backendStatus: string): 'platform' | 'gap' | 'planned' | 'waived' {
  if (backendStatus === 'verified') return 'platform'
  if (backendStatus === 'gap') return 'gap'
  if (backendStatus === 'planned') return 'planned'
  if (backendStatus === 'waived') return 'waived'
  return 'gap'
}

/**
 * Transform backend threats to frontend ComponentThreat format.
 */
export function transformBackendThreatsToComponentThreats(
  backendThreats: BackendThreat[]
): ComponentThreat[] {
  const now = new Date().toISOString()

  return backendThreats.map((bt) => {
    // Use different prefixes for component vs dataflow threats
    const isDataflow = bt.type === 'dataflow'
    const componentThreatId = isDataflow ? `backend-flow-${bt.id}` : `backend-${bt.id}`

    // Use different countermeasure prefixes based on threat type
    const countermeasures: ComponentThreatCountermeasure[] = bt.countermeasures.map((cm) => ({
      id: isDataflow ? `fcm-${cm.id}` : `cm-${cm.id}`,
      countermeasureId: `lib-${cm.countermeasureLibraryId}`,
      componentThreatId,
      status: transformCountermeasureStatus(cm.status),
      owner: cm.assignedOwnerEmail || undefined,
      notes: cm.evidenceUrl || undefined,
      createdAt: now,
      updatedAt: now,
      // Countermeasure metadata from backend (eliminates need for frontend registry lookup)
      countermeasureName: cm.countermeasureName || undefined,
      controlType: cm.controlType || undefined,
      standardMappings: cm.standardMappings || [],
    }))

    return {
      id: componentThreatId,
      diagramId: bt.dfdId || '',
      sourceDiagramId: bt.dfdId || undefined,
      sourceDiagramTitle: bt.dfdName || undefined,
      // For dataflows, use the edge_id as componentId (for grouping in UI)
      componentId: isDataflow
        ? (bt.edgeId || `dataflow-${bt.dataflowId}`)
        : (bt.nodeId || `component-${bt.componentId}`),
      threatId: `lib-${bt.threatLibraryId}`,
      dismissed: bt.status === 'accepted',
      notes: bt.justification || undefined,
      countermeasures,
      createdAt: now,
      updatedAt: now,
      // Threat metadata from backend (eliminates need for frontend registry lookup)
      threatName: bt.threatName || undefined,
      threatDescription: bt.threatDescription || undefined,
      strideCategory: bt.strideCategory || undefined,
      // Backend IDs for API operations
      backendThreatId: bt.id,
      backendComponentId: bt.componentId,
      threatType: bt.type,
    }
  })
}

/**
 * Fetch all threats for a threat model (aggregated from all DFDs).
 */
export function useThreatModelThreats(threatModelId: string | null | undefined) {
  return useQuery({
    queryKey: ['threat-model-threats', threatModelId],
    queryFn: threatModelId
      ? async () => {
          const response = await api.get<ThreatModelThreatsResponse>(
            `/threat-models/${threatModelId}/threats/`
          )
          const transformed = transformBackendThreatsToComponentThreats(response.threats)
          return {
            ...response,
            componentThreats: transformed,
          }
        }
      : skipToken,
    staleTime: 30000, // Consider fresh for 30 seconds
  })
}
