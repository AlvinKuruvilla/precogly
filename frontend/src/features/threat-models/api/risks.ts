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
