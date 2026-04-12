import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ReferenceImage } from '@/types'

export function useReferenceImages(threatModelId: string | null) {
  return useQuery({
    queryKey: ['reference-images', threatModelId],
    queryFn: async () => {
      const response = await api.get<{ results: ReferenceImage[] }>(
        `/threat-models/${threatModelId}/reference-images/`
      )
      return response.results
    },
    enabled: !!threatModelId,
  })
}

export function useUploadReferenceImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      threatModelId,
      file,
      description,
    }: {
      threatModelId: string
      file: File
      description?: string
    }) => {
      return api.uploadFile<ReferenceImage>(
        `/threat-models/${threatModelId}/reference-images/upload/`,
        file,
        description ? { description } : undefined
      )
    },
    onSuccess: (_, { threatModelId }) => {
      queryClient.invalidateQueries({
        queryKey: ['reference-images', threatModelId],
      })
      queryClient.invalidateQueries({
        queryKey: ['threat-models', threatModelId],
      })
    },
  })
}

export function useDeleteReferenceImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (imageId: number) => {
      return api.delete(`/reference-images/${imageId}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-images'] })
    },
  })
}

export function useUpdateReferenceImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      imageId,
      data,
    }: {
      imageId: number
      data: { description?: string; displayOrder?: number }
    }) => {
      return api.patch<ReferenceImage>(`/reference-images/${imageId}/`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-images'] })
    },
  })
}
