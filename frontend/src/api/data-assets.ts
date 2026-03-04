import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DataAsset {
  id: number
  name: string
  description: string
  classification: string
  confidentiality: string
  integrity: string
  availability: string
  complianceTags: string[]
  dataSensitivity: string[]
  threatModel: number | null
  formatMetadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export function useDataAssets(threatModelId: string | undefined) {
  return useQuery({
    queryKey: ['data-assets', threatModelId],
    queryFn: async () => {
      const response = await api.get<{ results: DataAsset[] } | DataAsset[]>(
        `/data-assets/?threat_model=${threatModelId}`
      )
      return Array.isArray(response) ? response : response.results
    },
    enabled: !!threatModelId,
  })
}

export function useCreateDataAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<DataAsset>) =>
      api.post<DataAsset>('/data-assets/', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['data-assets', String(variables.threatModel)] })
    },
  })
}

export function useUpdateDataAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DataAsset> }) =>
      api.patch<DataAsset>(`/data-assets/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-assets'] })
    },
  })
}

export function useDeleteDataAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`/data-assets/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-assets'] })
    },
  })
}
