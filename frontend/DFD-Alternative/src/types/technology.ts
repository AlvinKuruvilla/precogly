/**
 * Technology Registry Types
 * Based on SPECS.md - namespaced technology references
 *
 * Namespace format: <provider>:<service>:<variant>
 *
 * Examples:
 *   tech:postgresql      - Self-hosted PostgreSQL
 *   aws:rds:postgresql   - AWS RDS PostgreSQL
 *   azure:cosmos-db      - Azure Cosmos DB
 *   external:stripe      - Third-party Stripe
 */

// ═══════════════════════════════════════════════════════════════════════════
// TECHNOLOGY PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════

export type TechnologyProvider =
  | 'tech'      // Self-hosted / generic
  | 'aws'       // AWS managed services
  | 'azure'     // Azure managed services
  | 'gcp'       // GCP managed services
  | 'external'  // Third-party SaaS

// ═══════════════════════════════════════════════════════════════════════════
// TECHNOLOGY CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export type TechnologyCategory =
  | 'compute'
  | 'datastore'
  | 'messaging'
  | 'networking'
  | 'authentication'
  | 'storage'
  | 'api'
  | 'frontend'
  | 'monitoring'
  | 'security'

// ═══════════════════════════════════════════════════════════════════════════
// THREAT REFERENCE
// ═══════════════════════════════════════════════════════════════════════════

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface ThreatReference {
  id: string
  severity: ThreatSeverity
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL REFERENCE
// ═══════════════════════════════════════════════════════════════════════════

export interface ControlReference {
  id: string
  when?: string            // condition when this control applies (e.g., "#encrypted_at_rest")
  default?: boolean        // whether this control is enabled by default
  mitigates?: string       // which threat this control mitigates
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNOLOGY ENTRY
// ═══════════════════════════════════════════════════════════════════════════

export interface TechnologyEntry {
  id: string                         // namespaced ID: aws:rds:postgresql
  displayName: string                // human-readable: "Amazon RDS for PostgreSQL"
  provider: TechnologyProvider
  category: TechnologyCategory
  description?: string
  inherits?: string                  // parent technology to inherit from (e.g., aws:rds)

  // Threat analysis data
  inherentThreats: ThreatReference[]
  providedControls: ControlReference[]
  recommendedControls: ControlReference[]

  // Metadata
  documentation?: string             // URL to documentation
  icon?: string                      // icon identifier
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNOLOGY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

export type TechnologyRegistry = Record<string, TechnologyEntry>

// ═══════════════════════════════════════════════════════════════════════════
// AUTOCOMPLETE SUGGESTION
// ═══════════════════════════════════════════════════════════════════════════

export interface TechnologySuggestion {
  id: string
  displayName: string
  provider: TechnologyProvider
  category: TechnologyCategory
  icon?: string
  isRecent?: boolean
}

export interface TechnologySuggestionGroup {
  label: string
  suggestions: TechnologySuggestion[]
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a namespaced technology ID into its components
 */
export function parseTechnologyId(id: string): {
  provider: TechnologyProvider
  service: string
  variant?: string
} | null {
  const parts = id.split(':')
  if (parts.length < 2 || parts.length > 3) return null

  const provider = parts[0] as TechnologyProvider
  if (!['tech', 'aws', 'azure', 'gcp', 'external'].includes(provider)) {
    return null
  }

  return {
    provider,
    service: parts[1],
    variant: parts[2],
  }
}

/**
 * Build a namespaced technology ID from components
 */
export function buildTechnologyId(
  provider: TechnologyProvider,
  service: string,
  variant?: string
): string {
  if (variant) {
    return `${provider}:${service}:${variant}`
  }
  return `${provider}:${service}`
}

/**
 * Get the provider label for display
 */
export function getProviderLabel(provider: TechnologyProvider): string {
  switch (provider) {
    case 'tech': return 'Self-Hosted'
    case 'aws': return 'AWS'
    case 'azure': return 'Azure'
    case 'gcp': return 'Google Cloud'
    case 'external': return 'Third-Party'
  }
}

/**
 * Group technologies by provider for autocomplete
 */
export function groupByProvider(
  technologies: TechnologyEntry[],
  recentIds: string[] = []
): TechnologySuggestionGroup[] {
  const groups: TechnologySuggestionGroup[] = []

  // Add recent group first if there are recent items
  const recentTechs = technologies.filter(t => recentIds.includes(t.id))
  if (recentTechs.length > 0) {
    groups.push({
      label: '★ Recently Used',
      suggestions: recentTechs.map(t => ({
        id: t.id,
        displayName: t.displayName,
        provider: t.provider,
        category: t.category,
        icon: t.icon,
        isRecent: true,
      })),
    })
  }

  // Group by provider
  const byProvider = new Map<TechnologyProvider, TechnologyEntry[]>()
  for (const tech of technologies) {
    const list = byProvider.get(tech.provider) || []
    list.push(tech)
    byProvider.set(tech.provider, list)
  }

  // Add provider groups in order
  const providerOrder: TechnologyProvider[] = ['aws', 'azure', 'gcp', 'tech', 'external']
  for (const provider of providerOrder) {
    const techs = byProvider.get(provider)
    if (techs && techs.length > 0) {
      groups.push({
        label: getProviderLabel(provider),
        suggestions: techs.map(t => ({
          id: t.id,
          displayName: t.displayName,
          provider: t.provider,
          category: t.category,
          icon: t.icon,
        })),
      })
    }
  }

  return groups
}

/**
 * Filter technologies by search query
 */
export function filterTechnologies(
  technologies: TechnologyEntry[],
  query: string
): TechnologyEntry[] {
  const lowerQuery = query.toLowerCase()
  return technologies.filter(t =>
    t.id.toLowerCase().includes(lowerQuery) ||
    t.displayName.toLowerCase().includes(lowerQuery) ||
    t.category.toLowerCase().includes(lowerQuery)
  )
}
