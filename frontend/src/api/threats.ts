/**
 * API hooks for threat workflow endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ComponentThreat, ComponentThreatCountermeasure } from '@/features/dfd-editor/types/threat-analysis'

// Types
export interface ComponentInstanceThreat {
  id: number
  component: number
  component_name: string
  threat_library: number
  threat_name: string
  stride_category: string
  inherent_severity: string
  residual_severity: string
  status: 'open' | 'mitigated' | 'accepted'
  justification: string
  created_at: string
  updated_at: string
}

export interface CountermeasureLibraryItem {
  id: number
  name: string
  control_type: string
  cost: string
  source_pack_name: string | null
  source_pack_slug: string | null
}

export interface ComponentInstanceCountermeasure {
  id: number
  instance_threat: number
  countermeasure_library: number
  countermeasure_name: string
  status: 'gap' | 'planned' | 'verified' | 'waived'
  verified_by: number | null
  verified_by_email: string | null
  evidence_url: string
  required_for_release: boolean
  assigned_owner: number | null
  assigned_owner_email: string | null
  created_at: string
  updated_at: string
}

export interface GenerateThreatsResponse {
  created: ComponentInstanceThreat[]
  existing: ComponentInstanceThreat[]
  created_count: number
  existing_count: number
  total: number
  message: string
}

export interface SuggestedCountermeasuresResponse {
  threat_id: number
  threat_name: string
  suggested: CountermeasureLibraryItem[]
  applied: CountermeasureLibraryItem[]
  suggested_count: number
  applied_count: number
}

export interface ApplyCountermeasureResponse {
  countermeasure: ComponentInstanceCountermeasure
  message: string
}

export interface RecalculateStatusResponse {
  threat_id: number
  old_status: string
  new_status: string
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
        countermeasure_library_id: countermeasureLibraryId,
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
 * Update a countermeasure instance (e.g., status, evidence_url).
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
  threat_model_id: string
  threats: BackendThreat[]
  total_count: number
  node_component_map: Record<string, { component_id: number; dfd_id: string; dfd_name: string }>
}

/**
 * Backend threat format.
 */
export interface BackendThreat {
  id: number
  component_id: number
  component_name: string | null
  node_id: string | null
  dfd_id: string | null
  dfd_name: string | null
  threat_library_id: number
  threat_name: string | null
  threat_description: string | null
  stride_category: string | null
  inherent_severity: string
  residual_severity: string
  status: 'open' | 'mitigated' | 'accepted'
  justification: string
  countermeasures: BackendCountermeasure[]
}

/**
 * Backend countermeasure format.
 */
export interface BackendCountermeasure {
  id: number
  countermeasure_library_id: number
  countermeasure_name: string | null
  control_type: string | null
  status: 'gap' | 'planned' | 'verified' | 'waived'
  evidence_url: string
  assigned_owner_email: string | null
  verified_by_email: string | null
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
      countermeasureId: `lib-${cm.countermeasure_library_id}`,
      componentThreatId,
      status: transformCountermeasureStatus(cm.status),
      owner: cm.assigned_owner_email || undefined,
      notes: cm.evidence_url || undefined,
      createdAt: now,
      updatedAt: now,
    }))

    return {
      id: componentThreatId,
      diagramId: bt.dfd_id || '',
      sourceDiagramId: bt.dfd_id || undefined,
      sourceDiagramTitle: bt.dfd_name || undefined,
      componentId: bt.node_id || `component-${bt.component_id}`,
      threatId: `lib-${bt.threat_library_id}`,
      dismissed: bt.status === 'accepted',
      notes: bt.justification || undefined,
      countermeasures,
      createdAt: now,
      updatedAt: now,
      // Store backend IDs for API operations
      _backendThreatId: bt.id,
      _backendComponentId: bt.component_id,
      _threatName: bt.threat_name,
      _threatDescription: bt.threat_description,
      _strideCategory: bt.stride_category,
    } as ComponentThreat & {
      _backendThreatId: number
      _backendComponentId: number
      _threatName: string | null
      _threatDescription: string | null
      _strideCategory: string | null
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
