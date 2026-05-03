import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  TECHNOLOGY_CATEGORIES,
  NODE_TYPE_CATEGORIES,
  TRUST_ZONE_TECHNOLOGY_IDS,
  type Technology,
  type TechnologyCategory,
} from '../lib/technology-registry'
import { useTechnologies } from '../api/component-library'
import type { DiagramNodeType } from '../types'

interface TechnologyComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  filterCategory?: TechnologyCategory
  filterNodeType?: DiagramNodeType
  allowCustom?: boolean
  className?: string
  threatModelId?: string
}

export function TechnologyCombobox({
  value,
  onChange,
  placeholder = 'Select technology...',
  filterCategory,
  filterNodeType,
  allowCustom = true,
  className,
  threatModelId,
}: TechnologyComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch technologies from installed packs (filtered by threat model's connected packs)
  const { technologies, isLoading, isEmpty } = useTechnologies(threatModelId)

  // Determine which categories to filter by
  const filterCategories = useMemo(() => {
    if (filterCategory) return [filterCategory]
    if (filterNodeType) return NODE_TYPE_CATEGORIES[filterNodeType] || []
    return null
  }, [filterCategory, filterNodeType])

  // Filter and search technologies
  const filteredTechnologies = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim()

    let filtered = technologies.filter((tech) => {
      // Filter by search query
      const matchesQuery =
        !normalizedQuery ||
        tech.name.toLowerCase().includes(normalizedQuery) ||
        tech.id.toLowerCase().includes(normalizedQuery) ||
        tech.description?.toLowerCase().includes(normalizedQuery)

      // Filter by category
      const matchesCategory = !filterCategories || filterCategories.includes(tech.category)

      return matchesQuery && matchesCategory
    })

    // For trust zones, filter to only zone-defining technologies
    if (filterNodeType === 'trustZone') {
      filtered = filtered.filter((tech) => TRUST_ZONE_TECHNOLOGY_IDS.includes(tech.id))
    }

    return filtered
  }, [technologies, searchQuery, filterCategories, filterNodeType])

  // Group technologies by category
  const groupedTechnologies = useMemo(() => {
    const groups: Record<TechnologyCategory, Technology[]> = {} as Record<TechnologyCategory, Technology[]>

    for (const tech of filteredTechnologies) {
      if (!groups[tech.category]) {
        groups[tech.category] = []
      }
      groups[tech.category].push(tech)
    }

    return groups
  }, [filteredTechnologies])

  // Find current selection (match slug first, then fall back to name for legacy canvas data)
  const selectedTech = technologies.find(
    (t) => t.id === value || t.name.toLowerCase() === value.toLowerCase()
  )

  // Check if query doesn't match any technology (for custom option)
  const showCustomOption =
    allowCustom &&
    searchQuery.trim().length > 0 &&
    !technologies.some(
      (t) =>
        t.name.toLowerCase() === searchQuery.toLowerCase() ||
        t.id.toLowerCase() === searchQuery.toLowerCase()
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          {value ? (
            <span className="flex items-center gap-2">
              {selectedTech && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      TECHNOLOGY_CATEGORIES[selectedTech.category]?.color || '#64748b',
                  }}
                />
              )}
              {selectedTech?.name || value}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search technologies..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading technologies...
              </div>
            )}

            {/* Empty state - no packs installed */}
            {!isLoading && isEmpty && (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No technology packs installed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Install a technology pack to see available components
                </p>
              </div>
            )}

            {/* No results for search */}
            {!isLoading && !isEmpty && Object.keys(groupedTechnologies).length === 0 && !showCustomOption && (
              <CommandEmpty>No technologies found.</CommandEmpty>
            )}

            {/* Custom option */}
            {showCustomOption && (
              <CommandGroup heading="Custom">
                <CommandItem
                  value={searchQuery}
                  onSelect={() => {
                    onChange(searchQuery)
                    setOpen(false)
                    setSearchQuery('')
                  }}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Use "{searchQuery}"
                </CommandItem>
              </CommandGroup>
            )}

            {/* Grouped technologies */}
            {!isLoading && Object.entries(groupedTechnologies).map(([category, techs]) => (
              <CommandGroup
                key={category}
                heading={TECHNOLOGY_CATEGORIES[category as TechnologyCategory]?.label || category}
              >
                {techs.map((tech) => (
                  <CommandItem
                    key={tech.id}
                    value={tech.name}
                    onSelect={() => {
                      onChange(tech.id)
                      setOpen(false)
                      setSearchQuery('')
                    }}
                  >
                    <span
                      className="mr-2 h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          TECHNOLOGY_CATEGORIES[tech.category]?.color || '#64748b',
                      }}
                    />
                    <span className="flex-1">{tech.name}</span>
                    <Check
                      className={cn(
                        'h-4 w-4',
                        value === tech.id || value.toLowerCase() === tech.name.toLowerCase()
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
