import { CheckCircle2, Circle } from 'lucide-react'
import type { ReportProgressItem } from '@/types/report'
import { ReportSection } from '../ReportSection'

interface ProgressChecklistSectionProps {
  progressChecklist: ReportProgressItem[]
}

export function ProgressChecklistSection({ progressChecklist }: ProgressChecklistSectionProps) {
  const completedCount = progressChecklist.filter((item) => item.checked).length
  const totalCount = progressChecklist.length

  return (
    <ReportSection title="Progress Checklist">
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground mb-3">
          {completedCount} of {totalCount} items completed
        </div>
        {progressChecklist.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            {item.checked ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={item.checked ? '' : 'text-muted-foreground'}>{item.label}</span>
          </div>
        ))}
      </div>
    </ReportSection>
  )
}
