/**
 * API hooks for compliance frameworks.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Framework, FrameworkRequirement, CountermeasureStandardMapping } from '@/types/compliance'

// Query keys
export const complianceKeys = {
  all: ['compliance'] as const,
  frameworks: () => [...complianceKeys.all, 'frameworks'] as const,
  framework: (id: number) => [...complianceKeys.all, 'framework', id] as const,
  requirements: (frameworkId?: number) => [...complianceKeys.all, 'requirements', frameworkId] as const,
  countermeasureMappings: (countermeasureId?: number) => [...complianceKeys.all, 'mappings', countermeasureId] as const,
}

/**
 * Fetch all compliance frameworks.
 */
export function useFrameworks() {
  return useQuery({
    queryKey: complianceKeys.frameworks(),
    queryFn: async () => {
      const response = await api.get<{ results: Framework[] } | Framework[]>('/frameworks/')
      return Array.isArray(response) ? response : response.results
    },
  })
}

/**
 * Fetch a single framework by ID.
 */
export function useFramework(id: number | null) {
  return useQuery({
    queryKey: complianceKeys.framework(id!),
    queryFn: () => api.get<Framework>(`/frameworks/${id}/`),
    enabled: id !== null,
  })
}

/**
 * Fetch requirements for a framework.
 */
export function useFrameworkRequirements(frameworkId: number | null) {
  return useQuery({
    queryKey: complianceKeys.requirements(frameworkId ?? undefined),
    queryFn: async () => {
      const url = frameworkId
        ? `/requirements/?framework=${frameworkId}`
        : '/requirements/'
      const response = await api.get<{ results: FrameworkRequirement[] } | FrameworkRequirement[]>(url)
      return Array.isArray(response) ? response : response.results
    },
    enabled: frameworkId !== null,
  })
}

/**
 * Fetch countermeasure-standard mappings.
 */
export function useCountermeasureMappings(countermeasureId?: number) {
  return useQuery({
    queryKey: complianceKeys.countermeasureMappings(countermeasureId),
    queryFn: async () => {
      const url = countermeasureId
        ? `/countermeasure-standards/?countermeasure_library=${countermeasureId}`
        : '/countermeasure-standards/'
      const response = await api.get<{ results: CountermeasureStandardMapping[] } | CountermeasureStandardMapping[]>(url)
      return Array.isArray(response) ? response : response.results
    },
  })
}
