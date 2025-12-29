/**
 * API hooks for fetching component library (technologies) from installed packs.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Technology, TechnologyCategory } from '../lib/technology-registry'

// Backend response type
interface ComponentLibraryItem {
  id: number
  slug: string
  qualified_slug: string | null
  name: string
  category: 'process' | 'datastore' | 'external'  // Node type category
  component_type: string  // Technology category (database, compute, etc.)
  provider: string
  source_pack: number | null
  source_pack_name: string | null
  source_pack_slug: string | null
}

// Paginated response from DRF
interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Map backend provider to frontend vendor
function mapProviderToVendor(provider: string): Technology['vendor'] {
  const providerLower = provider.toLowerCase()
  if (providerLower === 'aws' || providerLower === 'amazon') return 'aws'
  if (providerLower === 'azure' || providerLower === 'microsoft') return 'azure'
  if (providerLower === 'gcp' || providerLower === 'google') return 'gcp'
  return 'generic'
}

// Map backend component_type to frontend TechnologyCategory
function mapComponentTypeToCategory(componentType: string): TechnologyCategory {
  const typeMap: Record<string, TechnologyCategory> = {
    database: 'database',
    storage: 'storage',
    cache: 'cache',
    compute: 'compute',
    backend: 'backend',
    frontend: 'frontend',
    messaging: 'messaging',
    networking: 'networking',
    security: 'security',
    auth: 'auth',
    monitoring: 'monitoring',
    infrastructure: 'infrastructure',
  }
  return typeMap[componentType.toLowerCase()] || 'other'
}

// Transform backend item to frontend Technology format
function transformToTechnology(item: ComponentLibraryItem): Technology {
  return {
    id: item.slug || item.qualified_slug || String(item.id),
    name: item.name,
    category: mapComponentTypeToCategory(item.component_type),
    vendor: mapProviderToVendor(item.provider),
    description: item.source_pack_name ? `From ${item.source_pack_name}` : undefined,
  }
}

/**
 * Fetch all available technologies from the component library API.
 * Returns technologies from installed packs for the user's organization.
 */
export function useComponentLibrary() {
  return useQuery({
    queryKey: ['component-library'],
    queryFn: async () => {
      // Fetch all pages of paginated results
      const allItems: ComponentLibraryItem[] = []
      let url: string | null = '/component-library/'

      while (url) {
        const response = await api.get<PaginatedResponse<ComponentLibraryItem>>(url)
        allItems.push(...response.results)
        // Get next page URL - extract just the path after /api
        if (response.next) {
          const nextUrl = new URL(response.next)
          // Remove the /api prefix since api.get() adds it
          url = nextUrl.pathname.replace(/^\/api/, '') + nextUrl.search
        } else {
          url = null
        }
      }

      return allItems.map(transformToTechnology)
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Hook that provides technologies with fallback to empty array if no packs installed.
 * Use this in the TechnologyCombobox component.
 */
export function useTechnologies() {
  const { data: technologies = [], isLoading, error } = useComponentLibrary()

  return {
    technologies,
    isLoading,
    error,
    isEmpty: !isLoading && technologies.length === 0,
  }
}
