import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ReportCompliance } from '@/features/reports/types/report'
import type { SectionDepth } from '../reportConfig'
import { ReportSection } from '../ReportSection'

interface ComplianceSectionProps {
  compliance: ReportCompliance
  depth: SectionDepth
}

function CoverageBar({ percentage }: { percentage: number }) {
  const barColor = percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm font-medium">{percentage}%</span>
    </div>
  )
}

export function ComplianceSection({ compliance, depth }: ComplianceSectionProps) {
  if (compliance.frameworks.length === 0) {
    return (
      <ReportSection title="Compliance Mapping">
        <p className="text-sm text-muted-foreground">No compliance frameworks linked.</p>
      </ReportSection>
    )
  }

  if (depth === 'summary') {
    return (
      <ReportSection title="Compliance Status">
        <div className="space-y-2">
          {compliance.frameworks.map((fw) => (
            <div key={fw.slug} className="flex items-center justify-between">
              <span className="text-sm font-medium">{fw.name}</span>
              <CoverageBar percentage={fw.satisfactionPercentage} />
            </div>
          ))}
        </div>
      </ReportSection>
    )
  }

  return (
    <ReportSection title="Compliance Mapping">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Framework</TableHead>
            <TableHead className="text-right">Requirements</TableHead>
            <TableHead>
              Covered
              <Tooltip>
                <TooltipTrigger asChild>
                  <sup className="ml-0.5 cursor-help text-muted-foreground">?</sup>
                </TooltipTrigger>
                <TooltipContent>
                  Requirement has at least one countermeasure mapped to it
                </TooltipContent>
              </Tooltip>
            </TableHead>
            <TableHead>
              Satisfied
              <Tooltip>
                <TooltipTrigger asChild>
                  <sup className="ml-0.5 cursor-help text-muted-foreground">?</sup>
                </TooltipTrigger>
                <TooltipContent>
                  Requirement has at least one countermeasure with status Verified or Platform
                </TooltipContent>
              </Tooltip>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {compliance.frameworks.map((fw) => (
            <TableRow key={fw.slug}>
              <TableCell className="font-medium">{fw.name}</TableCell>
              <TableCell className="text-right">{fw.totalRequirements}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{fw.coveredRequirements}/{fw.totalRequirements}</span>
                  <CoverageBar percentage={fw.coveragePercentage} />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{fw.satisfiedRequirements}/{fw.totalRequirements}</span>
                  <CoverageBar percentage={fw.satisfactionPercentage} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground mt-2">
        Bar color: green = 80%+, yellow = 50-79%, red = below 50%.
      </p>
    </ReportSection>
  )
}
