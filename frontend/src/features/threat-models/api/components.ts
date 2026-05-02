/**
 * API hooks for component operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Types

export interface ComponentLibraryItem {
  id: number
  name: string
  category: string
  componentType: string
  provider: string | null
  sourcePackName: string | null
  sourcePackSlug: string | null
}

export interface TrustZone {
  id: number
  name: string
  trustLevel: number
  description: string
}

export interface OrgsystemComponent {
  id: number
  name: string
  description: string
  category: string
  actorType: string
  dataStoreType: string
  orgsystem: number | null
  componentLibrary: number | null
  componentLibraryName: string | null
  trustZone: number | null
  sourceIntegration: number | null
  threatModel: number | null
  parentComponent: number | null
  formatMetadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// Query keys

export const componentKeys = {
  all: ['components'] as const,
  library: ['component-library-raw'] as const,
  analysisComponents: (threatModelId: string) =>
    [...componentKeys.all, 'analysis', threatModelId] as const,
}

// Query Hooks

/**
 * Fetch all components from the component library.
 * Optionally filtered by a threat model's connected packs.
 */
export function useComponentLibrary(threatModelId?: string) {
  return useQuery({
    queryKey: [...componentKeys.library, threatModelId],
    queryFn: async () => {
      const params = threatModelId ? `?threat_model=${threatModelId}` : ''
      const response = await api.get<{ results: ComponentLibraryItem[] } | ComponentLibraryItem[]>(
        `/component-library/${params}`
      )
      return Array.isArray(response) ? response : response.results
    },
  })
}

/**
 * Fetch analysis-only components for a threat model.
 * These are components linked directly to a threat model (not via DFD).
 */
export function useAnalysisComponents(threatModelId: string | null) {
  return useQuery({
    queryKey: componentKeys.analysisComponents(threatModelId!),
    queryFn: async () => {
      const response = await api.get<{ results: OrgsystemComponent[] } | OrgsystemComponent[]>(
        `/components/?threat_model=${threatModelId}`
      )
      return Array.isArray(response) ? response : response.results
    },
    enabled: !!threatModelId,
  })
}

/**
 * Fetch trust zones. When threatModelId is provided, scopes to zones
 * that have components belonging to that threat model (avoids duplicates
 * from other models).
 */
export function useTrustZones(threatModelId?: string | null) {
  return useQuery({
    queryKey: ['trust-zones', threatModelId],
    queryFn: async () => {
      const url = threatModelId
        ? `/trust-zones/?threat_model=${threatModelId}`
        : '/trust-zones/'
      const response = await api.get<{ results: TrustZone[] } | TrustZone[]>(url)
      return Array.isArray(response) ? response : response.results
    },
  })
}

// Mutation Hooks

/**
 * Create a new analysis-only component (linked to threat model, not DFD).
 */
export function useCreateAnalysisComponent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      category: string
      componentLibrary?: number | null
      threatModel: number
      trustZone?: number | null
    }) => api.post<OrgsystemComponent>('/components/', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: componentKeys.all })
      queryClient.invalidateQueries({
        queryKey: componentKeys.analysisComponents(String(variables.threatModel))
      })
      queryClient.invalidateQueries({
        queryKey: ['threat-model-threats', String(variables.threatModel)]
      })
    },
  })
}

/**
 * Delete a component.
 */
export function useDeleteComponent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (componentId: number) => api.delete(`/components/${componentId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: componentKeys.all })
      queryClient.invalidateQueries({ queryKey: ['threat-model-threats'] })
    },
  })
}
