import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ComponentDataAsset {
  id: number
  component: number
  componentName: string
  dataAsset: number
  dataAssetName: string
  dataState: 'at_rest' | 'processed'
  volume: string
  encrypted: boolean
  createdAt: string
  updatedAt: string
}

export function useComponentDataAssets(componentId: number | undefined) {
  return useQuery({
    queryKey: ['component-data-assets', componentId],
    queryFn: async () => {
      const response = await api.get<{ results: ComponentDataAsset[] } | ComponentDataAsset[]>(
        `/component-data-assets/?component=${componentId}`
      )
      return Array.isArray(response) ? response : response.results
    },
    enabled: !!componentId,
  })
}

export function useCreateComponentDataAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<ComponentDataAsset>) =>
      api.post<ComponentDataAsset>('/component-data-assets/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-data-assets'] })
    },
  })
}

export function useUpdateComponentDataAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ComponentDataAsset> }) =>
      api.patch<ComponentDataAsset>(`/component-data-assets/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-data-assets'] })
    },
  })
}

export function useDeleteComponentDataAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`/component-data-assets/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-data-assets'] })
    },
  })
}
