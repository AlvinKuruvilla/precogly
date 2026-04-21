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
  const type = componentType.toLowerCase()

  // Exact matches first
  const exactMap: Record<string, TechnologyCategory> = {
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

  if (exactMap[type]) {
    return exactMap[type]
  }

  // Partial matches for descriptive backend values
  if (type.includes('database')) return 'database'
  if (type.includes('storage')) return 'storage'
  if (type.includes('cache')) return 'cache'
  if (type.includes('queue') || type.includes('messaging') || type.includes('event')) return 'messaging'
  if (type.includes('function') || type.includes('lambda') || type.includes('compute') || type.includes('container')) return 'compute'
  if (type.includes('api') || type.includes('gateway') || type.includes('backend') || type.includes('server')) return 'backend'
  if (type.includes('network') || type.includes('vpc') || type.includes('load balancer') || type.includes('cdn')) return 'networking'
  if (type.includes('auth') || type.includes('identity') || type.includes('iam')) return 'auth'
  if (type.includes('security') || type.includes('firewall') || type.includes('waf')) return 'security'
  if (type.includes('monitor') || type.includes('logging') || type.includes('metric')) return 'monitoring'

  return 'other'
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
      const items = await api.get<ComponentLibraryItem[]>('/component-library/')
      return items.map(transformToTechnology)
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
