/**
 * API hooks for library items.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  ComponentLibrary,
  ThreatLibrary,
  CountermeasureLibrary,
  DFDTemplate,
} from '@/types/libraries'

// Query keys
export const libraryKeys = {
  components: ['component-libraries'] as const,
  threats: ['threat-libraries'] as const,
  countermeasures: ['countermeasure-libraries'] as const,
  templates: ['dfd-templates'] as const,
}

/**
 * Fetch component libraries.
 */
export function useComponentLibraries() {
  return useQuery({
    queryKey: libraryKeys.components,
    queryFn: async () => {
      const response = await api.get<{ results: ComponentLibrary[] } | ComponentLibrary[]>(
        '/component-library/'
      )
      return Array.isArray(response) ? response : response.results
    },
  })
}

/**
 * Fetch threat libraries.
 */
export function useThreatLibraries() {
  return useQuery({
    queryKey: libraryKeys.threats,
    queryFn: async () => {
      const response = await api.get<{ results: ThreatLibrary[] } | ThreatLibrary[]>(
        '/threat-library/'
      )
      return Array.isArray(response) ? response : response.results
    },
  })
}

/**
 * Fetch countermeasure libraries.
 */
export function useCountermeasureLibraries() {
  return useQuery({
    queryKey: libraryKeys.countermeasures,
    queryFn: async () => {
      const response = await api.get<{ results: CountermeasureLibrary[] } | CountermeasureLibrary[]>(
        '/countermeasure-library/'
      )
      return Array.isArray(response) ? response : response.results
    },
  })
}

/**
 * Fetch DFD templates.
 */
export function useDFDTemplates() {
  return useQuery({
    queryKey: libraryKeys.templates,
    queryFn: async () => {
      const response = await api.get<{ results: DFDTemplate[] } | DFDTemplate[]>(
        '/dfd-templates/'
      )
      return Array.isArray(response) ? response : response.results
    },
  })
}
