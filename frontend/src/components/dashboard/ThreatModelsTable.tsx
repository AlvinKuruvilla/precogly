import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { ThreatModel } from '@/types'

interface ThreatModelsTableProps {
  threatModels: ThreatModel[]
  isLoading?: boolean
}

const statusConfig: Record<string, { label: string; variant: 'outline' | 'secondary' | 'default' }> = {
  in_progress: { label: 'In Progress', variant: 'outline' },
  pending_review: { label: 'Pending Review', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
}

const defaultStatus = { label: 'Unknown', variant: 'outline' as const }

const criticalityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
}

const defaultCriticality = { label: 'Not Set', className: 'bg-gray-50 text-gray-500 hover:bg-gray-50' }

export function ThreatModelsTable({ threatModels, isLoading }: ThreatModelsTableProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (threatModels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <p>No threat models found.</p>
        <p className="text-sm">Create your first threat model to get started.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criticality</TableHead>
          <TableHead>Frameworks</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Last Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {threatModels.map((model) => (
          <TableRow
            key={model.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => navigate(`/threat-models/${model.id}`)}
          >
            <TableCell className="font-medium">{model.name}</TableCell>
            <TableCell>
              {(() => {
                const config = model.status ? statusConfig[model.status] : defaultStatus
                return (
                  <Badge variant={config?.variant || defaultStatus.variant}>
                    {config?.label || defaultStatus.label}
                  </Badge>
                )
              })()}
            </TableCell>
            <TableCell>
              {(() => {
                const config = model.criticality ? criticalityConfig[model.criticality] : defaultCriticality
                return (
                  <Badge className={config?.className || defaultCriticality.className}>
                    {config?.label || defaultCriticality.label}
                  </Badge>
                )
              })()}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {model.frameworks?.length ? (
                  model.frameworks.map((framework) => (
                    <Badge key={framework} variant="outline" className="text-xs">
                      {framework}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
            </TableCell>
            <TableCell>{model.owner || '—'}</TableCell>
            <TableCell className="text-muted-foreground">
              {model.updatedAt
                ? formatDistanceToNow(new Date(model.updatedAt), { addSuffix: true })
                : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
