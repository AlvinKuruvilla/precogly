/**
 * API hooks for threat workflow endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
 * Update a countermeasure instance (e.g., status, evidenceUrl).
 */
export function useUpdateCountermeasure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      countermeasureId,
      data,
    }: {
      countermeasureId: number
      data: Partial<ComponentInstanceCountermeasure>
    }) => api.patch<ComponentInstanceCountermeasure>(`/component-countermeasures/${countermeasureId}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threatKeys.all })
    },
  })
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
  componentId: number
  componentName: string | null
  nodeId: string | null
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
    const componentThreatId = `backend-${bt.id}`

    const countermeasures: ComponentThreatCountermeasure[] = bt.countermeasures.map((cm) => ({
      id: `cm-${cm.id}`,
      countermeasureId: `lib-${cm.countermeasureLibraryId}`,
      componentThreatId,
      status: transformCountermeasureStatus(cm.status),
      owner: cm.assignedOwnerEmail || undefined,
      notes: cm.evidenceUrl || undefined,
      createdAt: now,
      updatedAt: now,
    }))

    return {
      id: componentThreatId,
      diagramId: bt.dfdId || '',
      sourceDiagramId: bt.dfdId || undefined,
      sourceDiagramTitle: bt.dfdName || undefined,
      componentId: bt.nodeId || `component-${bt.componentId}`,
      threatId: `lib-${bt.threatLibraryId}`,
      dismissed: bt.status === 'accepted',
      notes: bt.justification || undefined,
      countermeasures,
      createdAt: now,
      updatedAt: now,
      // Store backend IDs for API operations
      _backendThreatId: bt.id,
      _backendComponentId: bt.componentId,
      _threatName: bt.threatName,
      _threatDescription: bt.threatDescription,
      _strideCategory: bt.strideCategory,
    } as ComponentThreat & {
      _backendThreatId: number
      _backendComponentId: number
      _threatName: string | null
      _threatDescription: string | null
      _strideCategory: STRIDECategory | null
    }
  })
}

/**
 * Fetch all threats for a threat model (aggregated from all DFDs).
 */
export function useThreatModelThreats(threatModelId: string | null) {
  return useQuery({
    queryKey: ['threat-model-threats', threatModelId],
    queryFn: async () => {
      const response = await api.get<ThreatModelThreatsResponse>(
        `/threat-models/${threatModelId}/threats/`
      )
      return {
        ...response,
        componentThreats: transformBackendThreatsToComponentThreats(response.threats),
      }
    },
    enabled: threatModelId !== null,
    staleTime: 30000, // Consider fresh for 30 seconds
  })
}
