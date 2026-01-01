import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, ChevronDown, Check, X, Cloud, Server, Globe } from 'lucide-react'
import { searchTechnologies } from '../../lib/api'
import type { TechnologyEntry, TechnologyProvider } from '../../types/technology'
import { getProviderLabel } from '../../types/technology'

interface TechnologyPickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const PROVIDER_ICONS: Record<TechnologyProvider, typeof Cloud> = {
  aws: Cloud,
  azure: Cloud,
  gcp: Cloud,
  tech: Server,
  external: Globe,
}

const PROVIDER_COLORS: Record<TechnologyProvider, string> = {
  aws: 'text-orange-500',
  azure: 'text-blue-500',
  gcp: 'text-red-500',
  tech: 'text-gray-600',
  external: 'text-purple-500',
}

export function TechnologyPicker({
  value,
  onChange,
  placeholder = 'Select technology...',
  className = '',
}: TechnologyPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<TechnologyEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTech, setSelectedTech] = useState<TechnologyEntry | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Search for technologies
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    searchTechnologies(search, { limit: 20 }).then(({ technologies }) => {
      if (!cancelled) {
        setResults(technologies)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [search])

  // Load selected technology details
  useEffect(() => {
    if (value && !selectedTech) {
      searchTechnologies(value).then(({ technologies }) => {
        const tech = technologies.find(t => t.id === value)
        if (tech) setSelectedTech(tech)
      })
    }
  }, [value, selectedTech])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = useCallback((tech: TechnologyEntry) => {
    setSelectedTech(tech)
    onChange(tech.id)
    setIsOpen(false)
    setSearch('')
  }, [onChange])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTech(null)
    onChange('')
  }, [onChange])

  // Group results by provider
  const groupedResults = results.reduce((acc, tech) => {
    if (!acc[tech.provider]) {
      acc[tech.provider] = []
    }
    acc[tech.provider].push(tech)
    return acc
  }, {} as Record<TechnologyProvider, TechnologyEntry[]>)

  const providerOrder: TechnologyProvider[] = ['aws', 'azure', 'gcp', 'tech', 'external']

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected value / trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {selectedTech ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TechnologyIcon provider={selectedTech.provider} />
            <span className="truncate">{selectedTech.displayName}</span>
            <span className="text-xs text-gray-400 font-mono">{selectedTech.id}</span>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <div className="flex items-center gap-1">
          {selectedTech && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[300px] bg-white border border-gray-200 rounded-md shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search technologies..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                Loading...
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No technologies found
              </div>
            ) : (
              providerOrder.map((provider) => {
                const techs = groupedResults[provider]
                if (!techs || techs.length === 0) return null

                return (
                  <div key={provider}>
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 sticky top-0">
                      {getProviderLabel(provider)}
                    </div>
                    {techs.map((tech) => (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => handleSelect(tech)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 text-left"
                      >
                        <TechnologyIcon provider={tech.provider} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{tech.displayName}</div>
                          <div className="text-xs text-gray-400 font-mono">{tech.id}</div>
                        </div>
                        {tech.id === value && (
                          <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TechnologyIcon({ provider }: { provider: TechnologyProvider }) {
  const Icon = PROVIDER_ICONS[provider]
  const colorClass = PROVIDER_COLORS[provider]

  return <Icon className={`w-4 h-4 ${colorClass}`} />
}

/**
 * Compact inline picker for use in editor autocomplete
 */
export function TechnologyInlineComplete({
  onSelect,
  search,
  className = '',
}: {
  onSelect: (tech: TechnologyEntry) => void
  search: string
  className?: string
}) {
  const [results, setResults] = useState<TechnologyEntry[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    searchTechnologies(search, { limit: 8 }).then(({ technologies }) => {
      setResults(technologies)
      setSelectedIndex(0)
    })
  }, [search])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        onSelect(results[selectedIndex])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedIndex, onSelect])

  if (results.length === 0) {
    return null
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden ${className}`}>
      {results.map((tech, idx) => (
        <button
          key={tech.id}
          type="button"
          onClick={() => onSelect(tech)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ${
            idx === selectedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
          }`}
        >
          <TechnologyIcon provider={tech.provider} />
          <span className="font-medium">{tech.displayName}</span>
          <span className="text-xs text-gray-400 font-mono ml-auto">{tech.id}</span>
        </button>
      ))}
    </div>
  )
}
