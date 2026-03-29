/**
 * API hooks for compliance frameworks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Framework, FrameworkRequirement, CountermeasureStandardMapping } from '@/features/compliance/types/compliance'

// Types for instance-level mappings

export interface InstanceCountermeasureStandard {
  id: number
  componentCountermeasure?: number
  flowCountermeasure?: number
  requirement: number
  frameworkName: string
  frameworkSlug: string
  sectionCode: string
  requirementDescription: string
  sufficiency: 'full' | 'partial'
  createdAt: string
  updatedAt: string
}

// Query keys
export const complianceKeys = {
  all: ['compliance'] as const,
  frameworks: () => [...complianceKeys.all, 'frameworks'] as const,
  framework: (id: number) => [...complianceKeys.all, 'framework', id] as const,
  requirements: (frameworkId?: number) => [...complianceKeys.all, 'requirements', frameworkId] as const,
  countermeasureMappings: (countermeasureId?: number) => [...complianceKeys.all, 'mappings', countermeasureId] as const,
  instanceMappings: (countermeasureId: number, type: 'component' | 'flow') =>
    [...complianceKeys.all, 'instance-mappings', type, countermeasureId] as const,
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

// ============================================
// Instance-level Compliance Mappings
// ============================================

/**
 * Fetch instance-level compliance mappings for a component countermeasure.
 */
export function useComponentInstanceMappings(countermeasureId: number | null) {
  return useQuery({
    queryKey: complianceKeys.instanceMappings(countermeasureId!, 'component'),
    queryFn: async () => {
      const response = await api.get<{ results: InstanceCountermeasureStandard[] } | InstanceCountermeasureStandard[]>(
        `/instance-countermeasure-standards/?component_countermeasure=${countermeasureId}`
      )
      return Array.isArray(response) ? response : response.results
    },
    enabled: countermeasureId !== null,
  })
}

/**
 * Fetch instance-level compliance mappings for a flow countermeasure.
 */
export function useFlowInstanceMappings(countermeasureId: number | null) {
  return useQuery({
    queryKey: complianceKeys.instanceMappings(countermeasureId!, 'flow'),
    queryFn: async () => {
      const response = await api.get<{ results: InstanceCountermeasureStandard[] } | InstanceCountermeasureStandard[]>(
        `/flow-instance-countermeasure-standards/?flow_countermeasure=${countermeasureId}`
      )
      return Array.isArray(response) ? response : response.results
    },
    enabled: countermeasureId !== null,
  })
}

/**
 * Create an instance-level compliance mapping for a component countermeasure.
 */
export function useCreateComponentInstanceMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      componentCountermeasure: number
      requirement: number
      sufficiency: 'full' | 'partial'
    }) =>
      api.post<InstanceCountermeasureStandard>('/instance-countermeasure-standards/', {
        component_countermeasure: data.componentCountermeasure,
        requirement: data.requirement,
        sufficiency: data.sufficiency,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: complianceKeys.instanceMappings(variables.componentCountermeasure, 'component'),
      })
      queryClient.invalidateQueries({ queryKey: ['threat-model-threats'] })
    },
  })
}

/**
 * Create an instance-level compliance mapping for a flow countermeasure.
 */
export function useCreateFlowInstanceMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      flowCountermeasure: number
      requirement: number
      sufficiency: 'full' | 'partial'
    }) =>
      api.post<InstanceCountermeasureStandard>('/flow-instance-countermeasure-standards/', {
        flow_countermeasure: data.flowCountermeasure,
        requirement: data.requirement,
        sufficiency: data.sufficiency,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: complianceKeys.instanceMappings(variables.flowCountermeasure, 'flow'),
      })
      queryClient.invalidateQueries({ queryKey: ['threat-model-threats'] })
    },
  })
}

/**
 * Update an instance-level compliance mapping.
 */
export function useUpdateInstanceMapping(type: 'component' | 'flow') {
  const queryClient = useQueryClient()
  const endpoint = type === 'component'
    ? '/instance-countermeasure-standards'
    : '/flow-instance-countermeasure-standards'

  return useMutation({
    mutationFn: (data: {
      id: number
      sufficiency: 'full' | 'partial'
    }) =>
      api.patch<InstanceCountermeasureStandard>(`${endpoint}/${data.id}/`, {
        sufficiency: data.sufficiency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all })
      queryClient.invalidateQueries({ queryKey: ['threat-model-threats'] })
    },
  })
}

/**
 * Delete an instance-level compliance mapping.
 */
export function useDeleteInstanceMapping(type: 'component' | 'flow') {
  const queryClient = useQueryClient()
  const endpoint = type === 'component'
    ? '/instance-countermeasure-standards'
    : '/flow-instance-countermeasure-standards'

  return useMutation({
    mutationFn: (id: number) => api.delete(`${endpoint}/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all })
      queryClient.invalidateQueries({ queryKey: ['threat-model-threats'] })
    },
  })
}
