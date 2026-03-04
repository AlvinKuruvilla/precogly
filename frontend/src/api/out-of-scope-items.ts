import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface OutOfScopeItem {
  id: number
  threatModel: number
  name: string
  reason: string
  createdAt: string
  updatedAt: string
}

export function useOutOfScopeItems(threatModelId: string | undefined) {
  return useQuery({
    queryKey: ['out-of-scope-items', threatModelId],
    queryFn: async () => {
      const response = await api.get<{ results: OutOfScopeItem[] } | OutOfScopeItem[]>(
        `/threat-models/${threatModelId}/out-of-scope-items/`
      )
      return Array.isArray(response) ? response : response.results
    },
    enabled: !!threatModelId,
  })
}

export function useCreateOutOfScopeItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ threatModelId, data }: { threatModelId: string; data: { name: string; reason: string } }) =>
      api.post<OutOfScopeItem>(`/threat-models/${threatModelId}/out-of-scope-items/`, data),
    onSuccess: (_, { threatModelId }) => {
      queryClient.invalidateQueries({ queryKey: ['out-of-scope-items', threatModelId] })
    },
  })
}

export function useUpdateOutOfScopeItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ threatModelId, id, data }: { threatModelId: string; id: number; data: Partial<OutOfScopeItem> }) =>
      api.patch<OutOfScopeItem>(`/threat-models/${threatModelId}/out-of-scope-items/${id}/`, data),
    onSuccess: (_, { threatModelId }) => {
      queryClient.invalidateQueries({ queryKey: ['out-of-scope-items', threatModelId] })
    },
  })
}

export function useDeleteOutOfScopeItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ threatModelId, id }: { threatModelId: string; id: number }) =>
      api.delete(`/threat-models/${threatModelId}/out-of-scope-items/${id}/`),
    onSuccess: (_, { threatModelId }) => {
      queryClient.invalidateQueries({ queryKey: ['out-of-scope-items', threatModelId] })
    },
  })
}
