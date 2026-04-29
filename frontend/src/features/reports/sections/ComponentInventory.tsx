import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ReportComponent, ReportComponents, ReportDataFlow } from '@/features/reports/types/report'
import { ReportSection } from '../ReportSection'

interface ComponentInventoryProps {
  components: ReportComponents
  dataFlows: ReportDataFlow[]
}

function ComponentTable({ components, label }: { components: ReportComponent[]; label: string }) {
  if (components.length === 0) return null

  return (
    <div>
      <h4 className="font-medium mb-2">{label} ({components.length})</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Trust Zone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.map((comp) => (
            <TableRow key={comp.id}>
              <TableCell className="font-medium">{comp.name}</TableCell>
              <TableCell>{comp.componentType}</TableCell>
              <TableCell>{comp.provider || 'Not Available'}</TableCell>
              <TableCell>{comp.trustZone || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ComponentInventory({ components, dataFlows }: ComponentInventoryProps) {
  return (
    <ReportSection title="Components & Data Flows">
      <div className="space-y-4">
        <ComponentTable components={components.processes} label="Processes" />
        <ComponentTable components={components.dataStores} label="Data Stores" />
        <ComponentTable components={components.humanActors} label="Human Actors" />
        <ComponentTable components={components.systemActors} label="System Actors" />

        {/* Data Flows */}
        {dataFlows.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Data Flows ({dataFlows.length})</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Encrypted</TableHead>
                  <TableHead>Authenticated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataFlows.map((flow) => (
                  <TableRow key={flow.id}>
                    <TableCell className="font-medium">{flow.label}</TableCell>
                    <TableCell>{flow.source || '—'}</TableCell>
                    <TableCell>{flow.destination || '—'}</TableCell>
                    <TableCell>{flow.protocol || '—'}</TableCell>
                    <TableCell>{flow.encrypted ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{flow.authenticated ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportSection>
  )
}
