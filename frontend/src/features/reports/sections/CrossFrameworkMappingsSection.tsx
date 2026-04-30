import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ReportCompliance } from '@/features/reports/types/report'
import { ReportSection } from '../ReportSection'

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + '...'
}

interface CrossFrameworkMappingsSectionProps {
  compliance: ReportCompliance
}

export function CrossFrameworkMappingsSection({
  compliance,
}: CrossFrameworkMappingsSectionProps) {
  const groups = compliance.crossFrameworkMappings

  if (!groups || groups.length === 0) {
    return (
      <ReportSection title="Cross-Framework Mappings">
        <p className="text-sm text-muted-foreground">
          No cross-framework requirement mappings available. Mappings appear when
          two or more linked frameworks have requirement-level overlays defined.
        </p>
      </ReportSection>
    )
  }

  return (
    <ReportSection title="Cross-Framework Mappings">
      <p className="text-sm text-muted-foreground mb-4">
        Requirement-level mappings between compliance frameworks, showing how
        requirements in one standard relate to requirements in another.
      </p>
      <div className="space-y-6">
        {groups.map((group) => {
          const groupKey = `${group.sourceFramework}-${group.targetFramework}`
          return (
            <div key={groupKey}>
              <h4 className="text-sm font-semibold mb-2">
                {group.sourceFramework} &rarr; {group.targetFramework}{' '}
                <span className="font-normal text-muted-foreground">
                  ({group.mappings.length})
                </span>
              </h4>
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[42%]">Source</TableHead>
                    <TableHead className="w-[16%] text-center">Mapping</TableHead>
                    <TableHead className="w-[42%]">Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.mappings.map((entry, entryIndex) => (
                    <TableRow
                      key={`${entry.fromSectionCode}-${entry.toSectionCode}-${entryIndex}`}
                    >
                      <TableCell>
                        <span className="font-mono text-xs">
                          {entry.fromSectionCode}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground mt-0.5 cursor-help">
                              {truncateWords(entry.fromDescription, 7)}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm">
                            <p>{entry.fromDescription}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            entry.sufficiency === 'full'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }
                        >
                          {entry.sufficiency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">
                          {entry.toSectionCode}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground mt-0.5 cursor-help">
                              {truncateWords(entry.toDescription, 7)}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm">
                            <p>{entry.toDescription}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        })}
      </div>
    </ReportSection>
  )
}
