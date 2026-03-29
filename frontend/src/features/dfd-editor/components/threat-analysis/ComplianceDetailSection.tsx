import { ChevronDown, ChevronUp, Shield, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ComplianceStandardMapping } from '../../types/threat-analysis'

function ComplianceBadge({
  frameworkName,
  sectionCode,
  sufficiency
}: {
  frameworkName: string
  sectionCode: string
  sufficiency: 'full' | 'partial'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
        sufficiency === 'full'
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      )}
      title={`${sufficiency === 'full' ? 'Fully' : 'Partially'} addresses ${frameworkName} ${sectionCode}`}
    >
      {frameworkName && <span className="mr-0.5">{frameworkName}</span>}
      <span>{sectionCode}</span>
      {sufficiency === 'partial' && <span className="ml-0.5 opacity-70">(partial)</span>}
    </span>
  )
}

export function ComplianceDetailSection({
  mappings,
  isExpanded,
  onToggle,
  onEdit,
}: {
  mappings: ComplianceStandardMapping[]
  isExpanded: boolean
  onToggle: () => void
  onEdit?: () => void
}) {
  if (mappings.length === 0) return null

  const groupedByFramework = mappings.reduce((acc, mapping) => {
    if (!acc[mapping.frameworkName]) {
      acc[mapping.frameworkName] = []
    }
    acc[mapping.frameworkName].push(mapping)
    return acc
  }, {} as Record<string, ComplianceStandardMapping[]>)

  return (
    <div className="mt-2 pt-2 border-t">
      <div className="flex items-center justify-between">
        <button
          className="flex-1 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground"
          onClick={onToggle}
        >
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            <span className="font-medium">Compliance Coverage</span>
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              {mappings.length}
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            title="Edit compliance mappings"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {Object.entries(groupedByFramework).map(([framework, fwMappings]) => (
            <div key={framework} className="pl-2 border-l-2 border-slate-200">
              <div className="text-xs font-medium text-slate-600 mb-1">{framework}</div>
              <div className="space-y-1">
                {fwMappings.map((mapping) => (
                  <div key={mapping.id} className="flex items-start gap-2 text-xs">
                    <ComplianceBadge
                      frameworkName=""
                      sectionCode={mapping.sectionCode}
                      sufficiency={mapping.sufficiency}
                    />
                    <span className="text-muted-foreground flex-1 line-clamp-2">
                      {mapping.requirementDescription}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
