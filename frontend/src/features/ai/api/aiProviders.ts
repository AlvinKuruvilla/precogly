/**
 * React Query hooks for managing an organization's AI provider configs.
 *
 * These back the AI Providers settings page: list/create/update/delete a config
 * for the current org, plus a server-side "test connection" probe. The stored API
 * key is write-only end to end — it is sent on create/update but never read back,
 * and the probe runs on the server so the secret never reaches the browser.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  AIProviderConfig,
  CreateAIProviderInput,
  UpdateAIProviderInput,
  ProviderHealth,
} from '@/features/ai/types/aiProvider'

export const aiProviderKeys = {
  all: ['ai-providers'] as const,
  list: (orgId?: number) => [...aiProviderKeys.all, 'list', orgId] as const,
}

export function useAIProviders(organizationId?: number) {
  return useQuery({
    queryKey: aiProviderKeys.list(organizationId),
    queryFn: async () => {
      const url = organizationId
        ? `/ai-providers/?organization=${organizationId}`
        : '/ai-providers/'
      const response = await api.get<{ results: AIProviderConfig[] } | AIProviderConfig[]>(url)
      return Array.isArray(response) ? response : response.results
    },
    enabled: !!organizationId,
  })
}

export function useCreateAIProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAIProviderInput) =>
      api.post<AIProviderConfig>('/ai-providers/', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiProviderKeys.all })
    },
  })
}

export function useUpdateAIProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAIProviderInput }) =>
      api.patch<AIProviderConfig>(`/ai-providers/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiProviderKeys.all })
    },
  })
}

export function useDeleteAIProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/ai-providers/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiProviderKeys.all })
    },
  })
}

export function useTestAIProviderConnection() {
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ProviderHealth>(`/ai-providers/${id}/test-connection/`),
  })
}
