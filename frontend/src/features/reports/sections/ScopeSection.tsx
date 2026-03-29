import { Badge } from '@/components/ui/badge'
import type { ReportScope } from '@/features/reports/types/report'
import type { SectionDepth } from '../reportConfig'
import { ReportSection } from '../ReportSection'

interface ScopeSectionProps {
  scope: ReportScope
  depth: SectionDepth
}

const VALIDITY_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  unconfirmed: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
}

export function ScopeSection({ scope, depth }: ScopeSectionProps) {
  return (
    <ReportSection title="Scope & Assumptions">
      <div className="space-y-4">
        {/* Description */}
        {scope.description && (
          <div>
            <h4 className="font-medium mb-1">Description</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scope.description}</p>
          </div>
        )}

        {/* Assumptions */}
        {scope.assumptions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Assumptions ({scope.assumptions.length})</h4>
            <div className="space-y-2">
              {scope.assumptions.map((assumption) => (
                <div key={assumption.id} className="flex items-start gap-2 text-sm border rounded p-2">
                  <Badge className={VALIDITY_COLORS[assumption.validity] || ''}>
                    {assumption.validity}
                  </Badge>
                  <span>{assumption.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Out of scope */}
        {depth === 'full' && scope.outOfScopeItems.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Out of Scope ({scope.outOfScopeItems.length})</h4>
            <div className="space-y-1">
              {scope.outOfScopeItems.map((item) => (
                <div key={item.id} className="text-sm">
                  <span className="font-medium">{item.name}</span>
                  {item.reason && <span className="text-muted-foreground"> — {item.reason}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referenced models */}
        {scope.referencedModels.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Referenced Models</h4>
            <div className="flex flex-wrap gap-2">
              {scope.referencedModels.map((model) => (
                <Badge key={model.id} variant="outline">{model.name}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </ReportSection>
  )
}
