import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DataFlowAsset {
  id: number
  dataFlow: number
  dataFlowName: string
  dataAsset: number
  dataAssetName: string
  protectionMethod: 'encrypted' | 'masked' | 'tokenized' | 'hashed' | 'none'
  encryptionType: string
  format: string
  sensitivityOverride: string
  createdAt: string
  updatedAt: string
}

export function useDataFlowAssets(dataFlowId: number | undefined) {
  return useQuery({
    queryKey: ['data-flow-assets', dataFlowId],
    queryFn: async () => {
      const response = await api.get<{ results: DataFlowAsset[] } | DataFlowAsset[]>(
        `/data-flow-assets/?data_flow=${dataFlowId}`
      )
      return Array.isArray(response) ? response : response.results
    },
    enabled: !!dataFlowId,
  })
}

export function useCreateDataFlowAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<DataFlowAsset>) =>
      api.post<DataFlowAsset>('/data-flow-assets/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-flow-assets'] })
    },
  })
}

export function useUpdateDataFlowAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DataFlowAsset> }) =>
      api.patch<DataFlowAsset>(`/data-flow-assets/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-flow-assets'] })
    },
  })
}

export function useDeleteDataFlowAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`/data-flow-assets/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-flow-assets'] })
    },
  })
}
