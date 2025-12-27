/**
 * API hooks for Library Packs.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  LibraryPack,
  LibraryPackListItem,
  InstalledPack,
  PackInstallResponse,
  PackDependencyCheck,
  PackFilters,
} from '@/types/packs'

// Query keys
export const packKeys = {
  all: ['packs'] as const,
  lists: () => [...packKeys.all, 'list'] as const,
  list: (filters: PackFilters) => [...packKeys.lists(), filters] as const,
  details: () => [...packKeys.all, 'detail'] as const,
  detail: (id: number) => [...packKeys.details(), id] as const,
  dependencies: (id: number) => [...packKeys.all, 'dependencies', id] as const,
  installed: ['installed-packs'] as const,
}

// Build query string from filters
function buildQueryString(filters: PackFilters): string {
  const params = new URLSearchParams()
  if (filters.pack_type) params.append('pack_type', filters.pack_type)
  if (filters.tier) params.append('tier', filters.tier)
  if (filters.source) params.append('source', filters.source)
  if (filters.industry) params.append('industry', filters.industry)
  if (filters.tag) params.append('tag', filters.tag)
  if (filters.search) params.append('search', filters.search)
  const query = params.toString()
  return query ? `?${query}` : ''
}

// Query Hooks

/**
 * Fetch list of available packs with optional filters.
 */
export function usePacks(filters: PackFilters = {}) {
  return useQuery({
    queryKey: packKeys.list(filters),
    queryFn: async () => {
      const queryString = buildQueryString(filters)
      const response = await api.get<{ results: LibraryPackListItem[] } | LibraryPackListItem[]>(
        `/packs/${queryString}`
      )
      return Array.isArray(response) ? response : response.results
    },
  })
}

/**
 * Fetch a single pack by ID with full details.
 */
export function usePack(id: number | null) {
  return useQuery({
    queryKey: packKeys.detail(id!),
    queryFn: () => api.get<LibraryPack>(`/packs/${id}/`),
    enabled: id !== null,
  })
}

/**
 * Check dependencies for a pack before installation.
 */
export function usePackDependencies(id: number | null) {
  return useQuery({
    queryKey: packKeys.dependencies(id!),
    queryFn: () => api.get<PackDependencyCheck>(`/packs/${id}/check_dependencies/`),
    enabled: id !== null,
  })
}

/**
 * Fetch list of installed packs for the user's organization.
 */
export function useInstalledPacks() {
  return useQuery({
    queryKey: packKeys.installed,
    queryFn: async () => {
      const response = await api.get<{ results: InstalledPack[] } | InstalledPack[]>(
        '/installed-packs/'
      )
      return Array.isArray(response) ? response : response.results
    },
  })
}

// Mutation Hooks

/**
 * Install a pack for the user's organization.
 */
export function useInstallPack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      packId,
      installDependencies = false,
    }: {
      packId: number
      installDependencies?: boolean
    }) => {
      return api.post<PackInstallResponse>(`/packs/${packId}/install/`, {
        install_dependencies: installDependencies,
      })
    },
    onSuccess: () => {
      // Invalidate pack queries to refresh is_installed status
      queryClient.invalidateQueries({ queryKey: packKeys.all })
      queryClient.invalidateQueries({ queryKey: packKeys.installed })
    },
  })
}

/**
 * Uninstall a pack (by installation ID).
 */
export function useUninstallPack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (installationId: number) =>
      api.delete<{ message: string }>(`/installed-packs/${installationId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packKeys.all })
      queryClient.invalidateQueries({ queryKey: packKeys.installed })
    },
  })
}
