import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import type { ReportCompletionStatus, ReportProgressItem } from '@/features/reports/types/report'
import { ReportSection } from '../ReportSection'
import { cn } from '@/lib/utils'

interface ProgressChecklistSectionProps {
  progressChecklist: ReportProgressItem[]
  completionStatus?: ReportCompletionStatus
}

export function ProgressChecklistSection({ progressChecklist, completionStatus }: ProgressChecklistSectionProps) {
  // Use new format when available
  if (completionStatus) {
    return <CompletionStatusSection completionStatus={completionStatus} />
  }

  // Legacy fallback
  const completedCount = progressChecklist.filter((item) => item.checked).length
  const totalCount = progressChecklist.length

  return (
    <ReportSection title="Completion Status">
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

function CompletionStatusSection({ completionStatus }: { completionStatus: ReportCompletionStatus }) {
  return (
    <ReportSection title="Completion Status">
      <div className="space-y-6">
        {/* System Definition + Coverage side by side */}
        <div className="grid grid-cols-2 gap-8">
          {/* System Definition */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              System Definition
            </h4>
            <div className="space-y-2">
              {completionStatus.systemDefinition.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  {item.checked ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={cn('flex-1', !item.checked && 'text-muted-foreground')}>
                    {item.label}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.countLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Coverage */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Coverage
            </h4>
            <div className="space-y-3">
              {completionStatus.coverage.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium tabular-nums">
                      {item.numerator}/{item.denominator} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        item.percentage >= 80 && 'bg-green-500',
                        item.percentage >= 50 && item.percentage < 80 && 'bg-amber-500',
                        item.percentage < 50 && 'bg-red-500',
                      )}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quality Signals */}
        {completionStatus.qualitySignals.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Pack Cross-Check
            </h4>
            <div className="space-y-2">
              {completionStatus.qualitySignals.map((signal) => (
                <div key={signal.id}>
                  <div className="flex items-center gap-2 text-sm">
                    {signal.status === 'ok' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <span className={signal.status === 'ok' ? 'text-green-700' : 'text-amber-700'}>
                      {signal.status === 'ok' ? signal.okLabel : signal.warningLabel}
                    </span>
                  </div>
                  {signal.status === 'warning' && signal.flaggedItems.length > 0 && (
                    <ul className="ml-6 mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {signal.flaggedItems.map((flaggedItem) => (
                        <li key={flaggedItem.id}>
                          <span className="font-medium">{flaggedItem.name}</span>
                          {flaggedItem.detail && <span> — {flaggedItem.detail}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ReportSection>
  )
}
