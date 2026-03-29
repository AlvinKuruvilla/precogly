import { Badge } from '@/components/ui/badge'
import type { ReportScope } from '@/features/reports/types/report'
import type { SectionDepth } from '../reportConfig'
import { ReportSection } from '../ReportSection'

interface AssumptionsReviewSectionProps {
  scope: ReportScope
  depth: SectionDepth
}

const VALIDITY_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  unconfirmed: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
}

export function AssumptionsReviewSection({ scope, depth }: AssumptionsReviewSectionProps) {
  const assumptions = scope.assumptions

  // For 'flagged' depth, only show unconfirmed and rejected
  const filteredAssumptions = depth === 'flagged'
    ? assumptions.filter((a) => a.validity !== 'confirmed')
    : assumptions

  if (filteredAssumptions.length === 0) {
    return (
      <ReportSection title="Assumptions Review">
        <p className="text-sm text-muted-foreground">
          {depth === 'flagged'
            ? 'All assumptions confirmed.'
            : 'No assumptions defined.'}
        </p>
      </ReportSection>
    )
  }

  return (
    <ReportSection title={`Assumptions Review (${filteredAssumptions.length})`}>
      <div className="space-y-3">
        {filteredAssumptions.map((assumption) => (
          <div key={assumption.id} className="border rounded p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Badge className={VALIDITY_COLORS[assumption.validity] || ''}>
                {assumption.validity}
              </Badge>
              <p className="text-sm">{assumption.description}</p>
            </div>
            {assumption.topics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {assumption.topics.map((topic) => (
                  <Badge key={topic} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ReportSection>
  )
}
