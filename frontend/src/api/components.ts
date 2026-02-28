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

export interface OrgsystemComponent {
  id: number
  name: string
  category: string
  orgsystem: number | null
  componentLibrary: number | null
  componentLibraryName: string | null
  trustZone: number | null
  sourceIntegration: number | null
  threatModel: number | null
  createdAt: string
  updatedAt: string
}

// Query keys

export const componentKeys = {
  all: ['components'] as const,
  library: ['component-library'] as const,
  analysisComponents: (threatModelId: string) =>
    [...componentKeys.all, 'analysis', threatModelId] as const,
}

// Query Hooks

/**
 * Fetch all components from the component library.
 */
export function useComponentLibrary() {
  return useQuery({
    queryKey: componentKeys.library,
    queryFn: async () => {
      const response = await api.get<{ results: ComponentLibraryItem[] } | ComponentLibraryItem[]>(
        '/component-library/'
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
