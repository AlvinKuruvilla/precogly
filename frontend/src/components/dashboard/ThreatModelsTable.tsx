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

const statusConfig = {
  in_progress: { label: 'In Progress', variant: 'outline' as const },
  pending_review: { label: 'Pending Review', variant: 'secondary' as const },
  approved: { label: 'Approved', variant: 'default' as const },
}

const criticalityConfig = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
}

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
              <Badge variant={statusConfig[model.status].variant}>
                {statusConfig[model.status].label}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge className={criticalityConfig[model.criticality].className}>
                {criticalityConfig[model.criticality].label}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {model.frameworks.map((framework) => (
                  <Badge key={framework} variant="outline" className="text-xs">
                    {framework}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>{model.owner}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(model.updatedAt), { addSuffix: true })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
