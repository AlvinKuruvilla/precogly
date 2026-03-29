import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ReportDataAsset } from '@/features/reports/types/report'
import type { SectionDepth } from '../reportConfig'
import { ReportSection } from '../ReportSection'

interface DataAssetsSectionProps {
  dataAssets: ReportDataAsset[]
  depth: SectionDepth
}

const CIA_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

export function DataAssetsSection({ dataAssets, depth }: DataAssetsSectionProps) {
  if (dataAssets.length === 0) {
    return (
      <ReportSection title="Data Assets">
        <p className="text-sm text-muted-foreground">No data assets defined.</p>
      </ReportSection>
    )
  }

  return (
    <ReportSection title="Data Assets">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Classification</TableHead>
            <TableHead>C</TableHead>
            <TableHead>I</TableHead>
            <TableHead>A</TableHead>
            {depth === 'full' && <TableHead>Placements</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataAssets.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell>
                <div className="font-medium">{asset.name}</div>
                {depth === 'full' && asset.description && (
                  <div className="text-xs text-muted-foreground">{asset.description}</div>
                )}
              </TableCell>
              <TableCell>{asset.classification}</TableCell>
              <TableCell>
                <Badge className={CIA_COLORS[asset.confidentiality] || ''} variant="outline">
                  {asset.confidentiality}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={CIA_COLORS[asset.integrity] || ''} variant="outline">
                  {asset.integrity}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={CIA_COLORS[asset.availability] || ''} variant="outline">
                  {asset.availability}
                </Badge>
              </TableCell>
              {depth === 'full' && (
                <TableCell className="text-sm text-muted-foreground">
                  {asset.placements.map((p) => p.componentName).join(', ') || '—'}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportSection>
  )
}
