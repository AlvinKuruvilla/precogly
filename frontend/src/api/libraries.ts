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
  StandardRequirement,
} from '@/types/libraries'

// Query keys
export const libraryKeys = {
  components: ['component-libraries'] as const,
  threats: ['threat-libraries'] as const,
  countermeasures: ['countermeasure-libraries'] as const,
  templates: ['dfd-templates'] as const,
  requirements: ['standard-requirements'] as const,
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

/**
 * Fetch standard requirements (compliance).
 */
export function useRequirements() {
  return useQuery({
    queryKey: libraryKeys.requirements,
    queryFn: async () => {
      const response = await api.get<{ results: StandardRequirement[] } | StandardRequirement[]>(
        '/requirements/'
      )
      return Array.isArray(response) ? response : response.results
    },
  })
}

// Types for resolved template
export interface ResolutionResult {
  nodeId: string
  componentRef: string
  resolved: boolean
  componentLibraryId?: number
  componentLibraryName?: string
  error?: string
}

export interface ResolvedTemplate {
  id: number
  name: string
  description: string
  category: string
  diagramType: string
  canvasData: {
    nodes: unknown[]
    edges: unknown[]
  }
  sourcePackId: number | null
  sourcePackName: string | null
  resolutionResults: ResolutionResult[]
  allResolved: boolean
}

/**
 * Fetch a DFD template with resolved component_refs.
 *
 * This resolves component_ref values in template nodes to actual
 * component_library_id values that can be used when inserting the template.
 */
export async function fetchResolvedTemplate(templateId: number): Promise<ResolvedTemplate> {
  return api.get<ResolvedTemplate>(`/dfd-templates/${templateId}/resolved/`)
}
