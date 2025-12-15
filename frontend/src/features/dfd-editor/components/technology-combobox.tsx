import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
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
  TECHNOLOGIES,
  TECHNOLOGY_CATEGORIES,
  NODE_TYPE_CATEGORIES,
  searchTechnologies,
  type Technology,
  type TechnologyCategory,
} from '../lib/technology-registry'
import type { DiagramNodeType } from '../types'

interface TechnologyComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  filterCategory?: TechnologyCategory
  filterNodeType?: DiagramNodeType
  allowCustom?: boolean
  className?: string
}

export function TechnologyCombobox({
  value,
  onChange,
  placeholder = 'Select technology...',
  filterCategory,
  filterNodeType,
  allowCustom = true,
  className,
}: TechnologyComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Determine which categories to filter by
  const filterCategories = useMemo(() => {
    if (filterCategory) return [filterCategory]
    if (filterNodeType) return NODE_TYPE_CATEGORIES[filterNodeType] || []
    return null
  }, [filterCategory, filterNodeType])

  // Group technologies by category
  const groupedTechnologies = useMemo(() => {
    const filtered = searchTechnologies(searchQuery, filterCategories || undefined)

    const groups: Record<TechnologyCategory, Technology[]> = {} as Record<TechnologyCategory, Technology[]>

    for (const tech of filtered) {
      if (!groups[tech.category]) {
        groups[tech.category] = []
      }
      groups[tech.category].push(tech)
    }

    return groups
  }, [searchQuery, filterCategories])

  // Find current selection
  const selectedTech = TECHNOLOGIES.find(
    (t) => t.name.toLowerCase() === value.toLowerCase() || t.id === value.toLowerCase()
  )

  // Check if query doesn't match any technology (for custom option)
  const showCustomOption =
    allowCustom &&
    searchQuery.trim().length > 0 &&
    !TECHNOLOGIES.some(
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
            <CommandEmpty>
              {showCustomOption ? (
                <div className="py-2 px-3 text-sm text-muted-foreground">
                  Press Enter to use "{searchQuery}"
                </div>
              ) : (
                'No technologies found.'
              )}
            </CommandEmpty>

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
            {Object.entries(groupedTechnologies).map(([category, techs]) => (
              <CommandGroup
                key={category}
                heading={TECHNOLOGY_CATEGORIES[category as TechnologyCategory]?.label || category}
              >
                {techs.map((tech) => (
                  <CommandItem
                    key={tech.id}
                    value={tech.name}
                    onSelect={() => {
                      onChange(tech.name)
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
                        value.toLowerCase() === tech.name.toLowerCase()
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
