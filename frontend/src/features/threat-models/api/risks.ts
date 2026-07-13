/**
 * API hooks for risk endpoints.
 */

import { useQuery, useMutation, useQueryClient, skipToken } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Risk,
  ScoringMethod,
  CreateRiskInput,
  UpdateRiskInput,
  AddRemoveThreatsInput,
  BulkUpdateRisksInput,
  CountermeasureComment,
} from '@/types/risk'

// Query keys
export const riskKeys = {
  all: ['risks'] as const,
  list: (threatModelId: string) => [...riskKeys.all, 'list', threatModelId] as const,
  detail: (threatModelId: string, riskId: number) =>
    [...riskKeys.all, 'detail', threatModelId, riskId] as const,
  scoringMethods: ['scoring-methods'] as const,
}

/**
 * Fetch all risks for a threat model.
 */
export function useRisks(threatModelId: string | null | undefined) {
  return useQuery({
    queryKey: riskKeys.list(threatModelId!),
    queryFn: threatModelId
      ? async () => {
          const response = await api.get<{ results: Risk[] } | Risk[]>(
            `/threat-models/${threatModelId}/risks/`
          )
          return Array.isArray(response) ? response : response.results
        }
      : skipToken,
  })
}

/**
 * Fetch a single risk detail.
 */
export function useRisk(threatModelId: string | null | undefined, riskId: number | null) {
  return useQuery({
    queryKey: riskKeys.detail(threatModelId!, riskId!),
    queryFn:
      threatModelId && riskId
        ? () => api.get<Risk>(`/threat-models/${threatModelId}/risks/${riskId}/`)
        : skipToken,
  })
}

/**
 * Fetch available scoring methods.
 */
export function useScoringMethods() {
  return useQuery({
    queryKey: riskKeys.scoringMethods,
    queryFn: () => api.get<ScoringMethod[]>('/scoring-methods/'),
    staleTime: Infinity,
  })
}

/**
 * Create a new risk.
 */
export function useCreateRisk(threatModelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRiskInput) =>
      api.post<Risk>(`/threat-models/${threatModelId}/risks/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskKeys.list(threatModelId) })
    },
  })
}

/**
 * Update an existing risk.
 */
export function useUpdateRisk(threatModelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ riskId, data }: { riskId: number; data: UpdateRiskInput }) =>
      api.patch<Risk>(`/threat-models/${threatModelId}/risks/${riskId}/`, data),
    onSuccess: (_, { riskId }) => {
      queryClient.invalidateQueries({ queryKey: riskKeys.list(threatModelId) })
      queryClient.invalidateQueries({ queryKey: riskKeys.detail(threatModelId, riskId) })
    },
  })
}

/**
 * Delete a risk.
 */
export function useDeleteRisk(threatModelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (riskId: number) =>
      api.delete(`/threat-models/${threatModelId}/risks/${riskId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskKeys.list(threatModelId) })
    },
  })
}

/**
 * Recalculate a risk's residual score.
 */
export function useRecalculateRisk(threatModelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (riskId: number) =>
      api.post<Risk>(`/threat-models/${threatModelId}/risks/${riskId}/recalculate/`),
    onSuccess: (_, riskId) => {
      queryClient.invalidateQueries({ queryKey: riskKeys.list(threatModelId) })
      queryClient.invalidateQueries({ queryKey: riskKeys.detail(threatModelId, riskId) })
    },
  })
}

/**
 * Add threats to a risk.
 */
export function useAddRiskThreats(threatModelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ riskId, data }: { riskId: number; data: AddRemoveThreatsInput }) =>
      api.post<Risk>(`/threat-models/${threatModelId}/risks/${riskId}/add-threats/`, data),
    onSuccess: (_, { riskId }) => {
      queryClient.invalidateQueries({ queryKey: riskKeys.list(threatModelId) })
      queryClient.invalidateQueries({ queryKey: riskKeys.detail(threatModelId, riskId) })
    },
  })
}

/**
 * Remove threats from a risk.
 */
export function useRemoveRiskThreats(threatModelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ riskId, data }: { riskId: number; data: AddRemoveThreatsInput }) =>
      api.post<Risk>(`/threat-models/${threatModelId}/risks/${riskId}/remove-threats/`, data),
    onSuccess: (_, { riskId }) => {
      queryClient.invalidateQueries({ queryKey: riskKeys.list(threatModelId) })
      queryClient.invalidateQueries({ queryKey: riskKeys.detail(threatModelId, riskId) })
    },
  })
}

/**
 * Bulk update status/owner/due_date on multiple risks.
 */
export function useBulkUpdateRisks(threatModelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BulkUpdateRisksInput) =>
      api.post<{ updated: number }>(`/threat-models/${threatModelId}/risks/bulk-update/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskKeys.list(threatModelId) })
    },
  })
}

// Query keys for comments
export const commentKeys = {
  forComponent: (cmId: number) => ['countermeasure-comments', 'component', cmId] as const,
  forFlow: (cmId: number) => ['countermeasure-comments', 'flow', cmId] as const,
}

/**
 * Fetch comments for a component countermeasure.
 */
export function useCountermeasureComments(componentCmId: number | null) {
  return useQuery({
    queryKey: commentKeys.forComponent(componentCmId!),
    queryFn: componentCmId
      ? async () => {
          const res = await api.get<{ results: CountermeasureComment[] } | CountermeasureComment[]>(
            `/countermeasure-comments/?component_countermeasure=${componentCmId}`
          )
          return Array.isArray(res) ? res : res.results
        }
      : undefined,
    enabled: componentCmId !== null,
  })
}

/**
 * Fetch comments for a flow countermeasure.
 */
export function useFlowCountermeasureComments(flowCmId: number | null) {
  return useQuery({
    queryKey: commentKeys.forFlow(flowCmId!),
    queryFn: flowCmId
      ? async () => {
          const res = await api.get<{ results: CountermeasureComment[] } | CountermeasureComment[]>(
            `/countermeasure-comments/?flow_countermeasure=${flowCmId}`
          )
          return Array.isArray(res) ? res : res.results
        }
      : undefined,
    enabled: flowCmId !== null,
  })
}

/**
 * Add a comment to a countermeasure.
 */
export function useAddCountermeasureComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      body: string
      changeSummary?: string
      componentCountermeasure?: number
      flowCountermeasure?: number
    }) => api.post<CountermeasureComment>('/countermeasure-comments/', data),
    onSuccess: (_, vars) => {
      if (vars.componentCountermeasure) {
        queryClient.invalidateQueries({ queryKey: commentKeys.forComponent(vars.componentCountermeasure) })
      }
      if (vars.flowCountermeasure) {
        queryClient.invalidateQueries({ queryKey: commentKeys.forFlow(vars.flowCountermeasure) })
      }
    },
  })
}
