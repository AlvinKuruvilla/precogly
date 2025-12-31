/**
 * API hooks for fetching component library (technologies) from installed packs.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Technology, TechnologyCategory } from '../lib/technology-registry'

// Backend response type (camelCase from djangorestframework-camel-case middleware)
interface ComponentLibraryItem {
  id: number
  slug: string
  qualifiedSlug: string | null
  name: string
  category: 'process' | 'datastore' | 'external'  // Node type category
  componentType: string  // Technology category (database, compute, etc.)
  provider: string
  sourcePack: number | null
  sourcePackName: string | null
  sourcePackSlug: string | null
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
    id: item.slug || item.qualifiedSlug || String(item.id),
    name: item.name,
    category: mapComponentTypeToCategory(item.componentType),
    vendor: mapProviderToVendor(item.provider),
    description: item.sourcePackName ? `From ${item.sourcePackName}` : undefined,
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
        const response: PaginatedResponse<ComponentLibraryItem> = await api.get<PaginatedResponse<ComponentLibraryItem>>(url)
        allItems.push(...response.results)
        // Get next page URL - extract just the path after /api
        if (response.next) {
          const parsedUrl: URL = new URL(response.next)
          // Remove the /api prefix since api.get() adds it
          url = parsedUrl.pathname.replace(/^\/api/, '') + parsedUrl.search
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
