import { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CanvasData } from '../../types'
import type { ComponentThreat, CountermeasureStatus } from '../../types/threat-analysis'
import { deriveThreatStatus, THREAT_STATUS_CONFIG } from '../../types/threat-analysis'
import { STRIDE_CONFIG } from '@/types/domain'
import { getTechnologyById } from '../../lib/technology-registry'

interface TableViewProps {
  canvasData: CanvasData
  componentThreats: ComponentThreat[]
  onCountermeasureStatusChange: (
    componentThreatId: string,
    countermeasureId: string,
    status: CountermeasureStatus
  ) => void
  onSelectThreat: (componentId: string, threatId: string) => void
}

interface FlattenedThreat {
  componentThreatId: string
  componentId: string
  componentLabel: string
  componentType: string
  technology?: string
  threatId: string
  threatName: string
  strideCategory: string
  strideCategoryLabel: string
  status: 'exposed' | 'addressable' | 'mitigated'
  countermeasuresTotal: number
  countermeasuresResolved: number
  gaps: number
}

export function TableView({
  canvasData,
  componentThreats,
  onCountermeasureStatusChange: _onCountermeasureStatusChange,
  onSelectThreat,
}: TableViewProps) {
  // Mark as used - inline editing will be added later
  void _onCountermeasureStatusChange
  // Flatten all threats into table rows
  const flattenedThreats = useMemo((): FlattenedThreat[] => {
    const rows: FlattenedThreat[] = []

    componentThreats
      .filter((ct) => !ct.dismissed)
      .forEach((ct) => {
        const node = canvasData.nodes.find((n) => n.id === ct.componentId)
        if (!node) return

        // Use threat metadata from backend (stored in ComponentThreat)
        if (!ct.threatName || !ct.strideCategory) return

        const techId = (node.data as { technology?: string }).technology
        const tech = techId ? getTechnologyById(techId) : null

        const status = deriveThreatStatus(ct.countermeasures)
        const resolved = ct.countermeasures.filter(
          (cm) => cm.status === 'platform' || cm.status === 'planned' || cm.status === 'waived'
        ).length
        const gaps = ct.countermeasures.filter((cm) => cm.status === 'gap').length

        rows.push({
          componentThreatId: ct.id,
          componentId: ct.componentId,
          componentLabel: String(node.data.label),
          componentType: node.type as string,
          technology: tech?.name,
          threatId: ct.threatId,
          threatName: ct.threatName,
          strideCategory: ct.strideCategory,
          strideCategoryLabel: STRIDE_CONFIG[ct.strideCategory]?.label ?? ct.strideCategory,
          status,
          countermeasuresTotal: ct.countermeasures.length,
          countermeasuresResolved: resolved,
          gaps,
        })
      })

    // Sort by status (exposed first, then addressable, then mitigated)
    const statusOrder = { exposed: 0, addressable: 1, mitigated: 2 }
    rows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

    return rows
  }, [componentThreats, canvasData.nodes])

  // Summary stats
  const stats = useMemo(() => {
    const exposed = flattenedThreats.filter((t) => t.status === 'exposed').length
    const addressable = flattenedThreats.filter((t) => t.status === 'addressable').length
    const mitigated = flattenedThreats.filter((t) => t.status === 'mitigated').length
    return { total: flattenedThreats.length, exposed, addressable, mitigated }
  }, [flattenedThreats])

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="px-4 py-3 border-b flex items-center gap-6">
        <div className="text-sm">
          <span className="font-medium">{stats.total}</span>{' '}
          <span className="text-muted-foreground">total threats</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm">
              <span className="font-medium">{stats.exposed}</span>{' '}
              <span className="text-muted-foreground">exposed</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-sm">
              <span className="font-medium">{stats.addressable}</span>{' '}
              <span className="text-muted-foreground">in progress</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm">
              <span className="font-medium">{stats.mitigated}</span>{' '}
              <span className="text-muted-foreground">mitigated</span>
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Status</TableHead>
              <TableHead>Component</TableHead>
              <TableHead>Technology</TableHead>
              <TableHead>Threat</TableHead>
              <TableHead>STRIDE</TableHead>
              <TableHead className="text-center">Countermeasures</TableHead>
              <TableHead className="text-center">Gaps</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedThreats.map((row) => {
              const statusConfig = THREAT_STATUS_CONFIG[row.status]
              const strideConfig = STRIDE_CONFIG[row.strideCategory as keyof typeof STRIDE_CONFIG]
              const strideColor = strideConfig?.color ?? '#6b7280' // gray fallback
              const strideShortLabel = strideConfig?.shortLabel ?? '?'

              return (
                <TableRow key={row.componentThreatId}>
                  <TableCell>
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: statusConfig.color }}
                      title={statusConfig.label}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.componentLabel}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {row.componentType}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.technology ? (
                      <span className="text-sm">{row.technology}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{row.threatName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: strideColor,
                        color: strideColor,
                      }}
                    >
                      {strideShortLabel}
                    </Badge>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {row.strideCategoryLabel}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">
                      {row.countermeasuresResolved}/{row.countermeasuresTotal}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {row.gaps > 0 ? (
                      <Badge variant="outline" className="bg-red-100 text-red-700">
                        {row.gaps}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onSelectThreat(row.componentId, row.componentThreatId)}
                      title="View details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}

            {flattenedThreats.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No threats found. Add technology to your components to see suggested threats.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
