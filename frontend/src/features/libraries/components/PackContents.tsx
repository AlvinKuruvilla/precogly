import { useMemo } from 'react'
import {
  Loader2,
  Server,
  Shield,
  Bug,
  ClipboardList,
  Tags,
} from 'lucide-react'
import { useComponentLibraries, useThreatLibraries, useCountermeasureLibraries, useRequirements, useTaxonomies, useTaxonomyEntries } from '@/features/libraries/api/libraries'
import { Link } from 'react-router-dom'

export function PackContents({
  packId,
  packName,
}: {
  packId: number
  packName: string
}) {
  const { data: allComponents, isLoading: loadingComponents } = useComponentLibraries()
  const { data: allThreats, isLoading: loadingThreats } = useThreatLibraries()
  const { data: allCountermeasures, isLoading: loadingCountermeasures } = useCountermeasureLibraries()
  const { data: allRequirements, isLoading: loadingRequirements } = useRequirements()
  const { data: allTaxonomies, isLoading: loadingTaxonomies } = useTaxonomies()
  const { data: allTaxonomyEntries, isLoading: loadingEntries } = useTaxonomyEntries()

  const isLoading = loadingComponents || loadingThreats || loadingCountermeasures || loadingRequirements || loadingTaxonomies || loadingEntries

  // Filter by packId (sourcePack is the pack's database ID)
  const components = useMemo(
    () => allComponents?.filter((c) => c.sourcePack === packId) ?? [],
    [allComponents, packId]
  )
  const threats = useMemo(
    () => allThreats?.filter((t) => t.sourcePack === packId) ?? [],
    [allThreats, packId]
  )
  const countermeasures = useMemo(
    () => allCountermeasures?.filter((cm) => cm.sourcePack === packId) ?? [],
    [allCountermeasures, packId]
  )
  const requirements = useMemo(
    () => allRequirements?.filter((r) => r.sourcePack === packId) ?? [],
    [allRequirements, packId]
  )
  const taxonomies = useMemo(
    () => allTaxonomies?.filter((t) => t.sourcePack === packId) ?? [],
    [allTaxonomies, packId]
  )

  // Group taxonomy entries by taxonomy slug for this pack's taxonomies
  const taxonomySlugs = useMemo(
    () => new Set(taxonomies.map((t) => t.slug)),
    [taxonomies]
  )
  const entriesByTaxonomy = useMemo(() => {
    if (!allTaxonomyEntries || taxonomySlugs.size === 0) return new Map<string, typeof allTaxonomyEntries>()
    const grouped = new Map<string, typeof allTaxonomyEntries>()
    for (const entry of allTaxonomyEntries) {
      if (!taxonomySlugs.has(entry.taxonomySlug)) continue
      const existing = grouped.get(entry.taxonomySlug) ?? []
      existing.push(entry)
      grouped.set(entry.taxonomySlug, existing)
    }
    return grouped
  }, [allTaxonomyEntries, taxonomySlugs])

  if (isLoading) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
        Loading pack contents...
      </div>
    )
  }

  const hasComponents = components.length > 0
  const hasThreats = threats.length > 0
  const hasCountermeasures = countermeasures.length > 0
  const hasRequirements = requirements.length > 0
  const hasTaxonomies = taxonomies.length > 0

  if (!hasComponents && !hasThreats && !hasCountermeasures && !hasRequirements && !hasTaxonomies) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        No content in this pack
      </div>
    )
  }

  // Build URLs with pack filter
  const encodedPackName = encodeURIComponent(packName)
  const componentsUrl = `/tech-components?packId=${packId}&packName=${encodedPackName}`
  const threatsUrl = `/threat-libraries?packId=${packId}&packName=${encodedPackName}`
  const countermeasuresUrl = `/countermeasures?packId=${packId}&packName=${encodedPackName}`

  // Determine grid columns based on content types present
  const contentTypeCount = [hasComponents, hasThreats, hasCountermeasures, hasRequirements, hasTaxonomies].filter(Boolean).length
  const gridCols = contentTypeCount === 1 ? 'grid-cols-1' : contentTypeCount === 2 ? 'md:grid-cols-2' : contentTypeCount === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      {/* Components */}
      {hasComponents && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4 text-blue-600" />
              Components ({components.length})
            </div>
            <Link
              to={componentsUrl}
              className="text-xs text-primary hover:underline"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {components.slice(0, 10).map((c) => (
              <div
                key={c.id}
                className="text-sm text-muted-foreground truncate pl-6"
                title={c.name}
              >
                {c.name}
              </div>
            ))}
            {components.length > 10 && (
              <Link
                to={componentsUrl}
                className="text-xs text-primary hover:underline pl-6 block"
              >
                +{components.length - 10} more
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Threats */}
      {hasThreats && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bug className="h-4 w-4 text-red-600" />
              Threats ({threats.length})
            </div>
            <Link
              to={threatsUrl}
              className="text-xs text-primary hover:underline"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {threats.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="text-sm text-muted-foreground truncate pl-6"
                title={t.name}
              >
                {t.name}
              </div>
            ))}
            {threats.length > 10 && (
              <Link
                to={threatsUrl}
                className="text-xs text-primary hover:underline pl-6 block"
              >
                +{threats.length - 10} more
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Countermeasures */}
      {hasCountermeasures && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-green-600" />
              Countermeasures ({countermeasures.length})
            </div>
            <Link
              to={countermeasuresUrl}
              className="text-xs text-primary hover:underline"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {countermeasures.slice(0, 10).map((cm) => (
              <div
                key={cm.id}
                className="text-sm text-muted-foreground truncate pl-6"
                title={cm.name}
              >
                {cm.name}
              </div>
            ))}
            {countermeasures.length > 10 && (
              <Link
                to={countermeasuresUrl}
                className="text-xs text-primary hover:underline pl-6 block"
              >
                +{countermeasures.length - 10} more
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Requirements */}
      {hasRequirements && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList className="h-4 w-4 text-purple-600" />
            Requirements ({requirements.length})
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {requirements.map((r) => (
              <div
                key={r.id}
                className="text-sm text-muted-foreground truncate pl-6"
                title={`${r.sectionCode}: ${r.description}`}
              >
                {r.sectionCode}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Taxonomies */}
      {hasTaxonomies && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Tags className="h-4 w-4 text-teal-600" />
            Taxonomies ({taxonomies.length})
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {taxonomies.map((t) => {
              const entries = entriesByTaxonomy.get(t.slug) ?? []
              return (
                <div key={t.id}>
                  <div
                    className="text-sm font-medium text-muted-foreground pl-6"
                    title={t.description || t.name}
                  >
                    {t.name}
                  </div>
                  {entries.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="text-sm text-muted-foreground truncate pl-10"
                      title={entry.title}
                    >
                      {entry.externalId}: {entry.title}
                    </div>
                  ))}
                  {entries.length > 10 && (
                    <div className="text-xs text-muted-foreground pl-10">
                      +{entries.length - 10} more entries
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
