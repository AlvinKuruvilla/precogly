import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ThreatModel, DashboardStats, Framework, System, CreateThreatModelInput } from '@/types'
import { api } from '@/lib/api'

// Query Hooks
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats/'),
  })
}

export function useThreatModels() {
  return useQuery({
    queryKey: ['threat-models'],
    queryFn: async () => {
      const response = await api.get<{ results: ThreatModel[] } | ThreatModel[]>('/threat-models/')
      // Handle both paginated and non-paginated responses
      return Array.isArray(response) ? response : response.results
    },
  })
}

export function useThreatModel(id: string) {
  return useQuery({
    queryKey: ['threat-models', id],
    queryFn: () => api.get<ThreatModel>(`/threat-models/${id}/`),
    enabled: !!id,
  })
}

export function useFrameworks() {
  return useQuery({
    queryKey: ['frameworks'],
    queryFn: async () => {
      const response = await api.get<{ results: Framework[] } | Framework[]>('/frameworks/')
      return Array.isArray(response) ? response : response.results
    },
  })
}

export function useSystems() {
  return useQuery({
    queryKey: ['systems'],
    queryFn: async () => {
      const response = await api.get<{ results: System[] } | System[]>('/systems/')
      return Array.isArray(response) ? response : response.results
    },
  })
}

// Mutation Hooks
export function useCreateThreatModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateThreatModelInput) =>
      api.post<ThreatModel>('/threat-models/', input),
    onSuccess: () => {
      // Invalidate related queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['threat-models'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

export function useUpdateThreatModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ThreatModel> }) =>
      api.patch<ThreatModel>(`/threat-models/${id}/`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['threat-models'] })
      queryClient.invalidateQueries({ queryKey: ['threat-models', id] })
    },
  })
}

export function useDeleteThreatModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/threat-models/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-models'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['diagrams'] })
    },
  })
}

export interface DeletePreviewDFD {
  id: string
  name: string
  node_count: number
  shared_with?: Array<{ id: string; name: string }>
}

export interface DeletePreviewResponse {
  threat_model: { id: string; name: string }
  dfds_to_delete: DeletePreviewDFD[]
  dfds_to_preserve: DeletePreviewDFD[]
  total_dfds: number
}

export function useDeletePreview(id: string | null) {
  return useQuery({
    queryKey: ['threat-model-delete-preview', id],
    queryFn: () => api.get<DeletePreviewResponse>(`/threat-models/${id}/delete_preview/`),
    enabled: !!id,
  })
}
