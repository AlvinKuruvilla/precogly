import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ReportArchitecture } from '@/types/report'
import { ReportSection } from '../ReportSection'

interface ArchitectureSectionProps {
  architecture: ReportArchitecture
}

export function ArchitectureSection({ architecture }: ArchitectureSectionProps) {
  return (
    <ReportSection title="Architecture">
      <div className="space-y-4">
        {/* DFDs */}
        {architecture.dfds.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Data Flow Diagrams</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Nodes</TableHead>
                  <TableHead className="text-right">Edges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {architecture.dfds.map((dfd) => (
                  <TableRow key={dfd.id}>
                    <TableCell className="font-medium">{dfd.name}</TableCell>
                    <TableCell>{dfd.diagramType}</TableCell>
                    <TableCell className="text-right">{dfd.nodeCount}</TableCell>
                    <TableCell className="text-right">{dfd.edgeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Trust Zones */}
        {architecture.trustZones.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Trust Zones</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Trust Level</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {architecture.trustZones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell className="text-right">{zone.trustLevel}</TableCell>
                    <TableCell className="text-muted-foreground">{zone.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Trust Boundaries */}
        {architecture.trustBoundaries.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Trust Boundaries</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Zone A</TableHead>
                  <TableHead>Zone B</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {architecture.trustBoundaries.map((boundary) => (
                  <TableRow key={boundary.id}>
                    <TableCell className="font-medium">{boundary.label}</TableCell>
                    <TableCell>{boundary.zoneA}</TableCell>
                    <TableCell>{boundary.zoneB}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Reference Images */}
        {architecture.referenceImages.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Reference Images</h4>
            <div className="space-y-1">
              {architecture.referenceImages.map((img) => (
                <div key={img.id} className="text-sm">
                  <span className="font-medium">{img.filename}</span>
                  {img.description && (
                    <span className="text-muted-foreground"> — {img.description}</span>
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
