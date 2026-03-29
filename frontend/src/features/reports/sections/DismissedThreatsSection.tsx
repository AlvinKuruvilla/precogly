import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ReportDismissedThreat } from '@/features/reports/types/report'
import { ReportSection } from '../ReportSection'

interface DismissedThreatsSectionProps {
  dismissedThreats: ReportDismissedThreat[]
}

export function DismissedThreatsSection({ dismissedThreats }: DismissedThreatsSectionProps) {
  if (dismissedThreats.length === 0) {
    return (
      <ReportSection title="Dismissed Threats" defaultOpen={false}>
        <p className="text-sm text-muted-foreground">No dismissed threats.</p>
      </ReportSection>
    )
  }

  return (
    <ReportSection title="Dismissed Threats" defaultOpen={false}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Threat</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dismissedThreats.map((threat) => (
            <TableRow key={threat.id}>
              <TableCell className="font-medium">{threat.threatName}</TableCell>
              <TableCell>
                <Badge variant="outline">{threat.type}</Badge>
              </TableCell>
              <TableCell>{threat.componentName || threat.flowLabel || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {threat.dismissalReason || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportSection>
  )
}
