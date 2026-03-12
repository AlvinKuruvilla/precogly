import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ReportCountermeasureSummary } from '@/types/report'
import type { SectionDepth } from '../reportConfig'
import { ReportSection } from '../ReportSection'

interface CountermeasureSectionProps {
  summary: ReportCountermeasureSummary
  depth: SectionDepth
  sectionId: string
}

const CM_STATUS_COLORS: Record<string, string> = {
  gap: 'border-l-red-500',
  planned: 'border-l-yellow-500',
  verified: 'border-l-green-500',
  platform: 'border-l-green-600',
  waived: 'border-l-blue-500',
}

const CM_STATUS_LABELS: Record<string, string> = {
  gap: 'Gap',
  planned: 'Planned',
  verified: 'Verified',
  platform: 'Platform',
  waived: 'Waived',
}

export function CountermeasureSection({ summary, depth, sectionId }: CountermeasureSectionProps) {
  // Status overview
  if (sectionId === 'countermeasureStatus') {
    const totalCms = Object.values(summary.statusBreakdown).reduce((sum, count) => sum + count, 0)

    return (
      <ReportSection title="Countermeasure Status">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(summary.statusBreakdown).map(([status, count]) => (
            <Card key={status} className={`border-l-4 ${CM_STATUS_COLORS[status] || ''}`}>
              <CardContent className="pt-3 pb-3">
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">
                  {CM_STATUS_LABELS[status] || status}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {totalCms > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            Total: {totalCms} countermeasures
          </div>
        )}
      </ReportSection>
    )
  }

  // Gaps section
  if (sectionId === 'gaps') {
    const gaps = depth === 'top3' ? summary.gaps.slice(0, 3) : summary.gaps

    if (gaps.length === 0) {
      return (
        <ReportSection title={depth === 'top3' ? 'Top Gaps' : 'Gaps'}>
          <p className="text-sm text-muted-foreground">No open gaps.</p>
        </ReportSection>
      )
    }

    return (
      <ReportSection title={depth === 'top3' ? 'Top Gaps' : `Gaps (${summary.gaps.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Countermeasure</TableHead>
              <TableHead>Component / Flow</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gaps.map((gap) => (
              <TableRow key={gap.id}>
                <TableCell className="font-medium">{gap.countermeasureName}</TableCell>
                <TableCell>{gap.componentName || gap.flowLabel || '—'}</TableCell>
                <TableCell>
                  {gap.priority ? (
                    <Badge variant="outline">{gap.priority}</Badge>
                  ) : '—'}
                </TableCell>
                <TableCell>{gap.assignedOwnerEmail || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {depth === 'top3' && summary.gaps.length > 3 && (
          <p className="mt-2 text-sm text-muted-foreground">
            + {summary.gaps.length - 3} more gaps
          </p>
        )}
      </ReportSection>
    )
  }

  // Waived section
  if (sectionId === 'waived') {
    if (depth === 'count') {
      return (
        <ReportSection title="Waived Countermeasures">
          <p className="text-sm">
            <span className="font-bold text-lg">{summary.waived.length}</span>{' '}
            <span className="text-muted-foreground">countermeasures waived</span>
          </p>
        </ReportSection>
      )
    }

    if (summary.waived.length === 0) {
      return (
        <ReportSection title="Waived Countermeasures">
          <p className="text-sm text-muted-foreground">No waived countermeasures.</p>
        </ReportSection>
      )
    }

    return (
      <ReportSection title={`Waived Countermeasures (${summary.waived.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Countermeasure</TableHead>
              <TableHead>Component / Flow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.waived.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.countermeasureName}</TableCell>
                <TableCell>{item.componentName || item.flowLabel || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ReportSection>
    )
  }

  // Inherited section
  if (sectionId === 'inherited') {
    if (summary.inherited.length === 0) {
      return (
        <ReportSection title="Inherited Countermeasures" defaultOpen={false}>
          <p className="text-sm text-muted-foreground">No inherited countermeasures.</p>
        </ReportSection>
      )
    }

    return (
      <ReportSection title={`Inherited Countermeasures (${summary.inherited.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Countermeasure</TableHead>
              <TableHead>Component</TableHead>
              <TableHead>Inherited From</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.inherited.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.countermeasureName}</TableCell>
                <TableCell>{item.componentName}</TableCell>
                <TableCell>
                  {item.inheritedFromComponentName} ({item.inheritedFromZoneName})
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ReportSection>
    )
  }

  return null
}
