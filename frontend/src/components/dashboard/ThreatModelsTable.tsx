import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Trash2, ExternalLink } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteThreatModelDialog } from '@/components/threat-models'
import { useDeleteThreatModel } from '@/api/threat-models'
import type { ThreatModel } from '@/types'

interface ThreatModelsTableProps {
  threatModels: ThreatModel[]
  isLoading?: boolean
}

const criticalityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
}

const defaultCriticality = { label: 'Not Set', className: 'bg-gray-50 text-gray-500 hover:bg-gray-50' }

export function ThreatModelsTable({ threatModels, isLoading }: ThreatModelsTableProps) {
  const navigate = useNavigate()
  const [modelToDelete, setModelToDelete] = useState<ThreatModel | null>(null)
  const deleteMutation = useDeleteThreatModel()

  const handleDelete = () => {
    if (modelToDelete) {
      deleteMutation.mutate(modelToDelete.id, {
        onSuccess: () => {
          setModelToDelete(null)
        },
      })
    }
  }

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
          <TableHead>Team</TableHead>
          <TableHead>Business Unit</TableHead>
          <TableHead>Criticality</TableHead>
          <TableHead>Frameworks</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead className="w-[50px]"></TableHead>
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
            <TableCell className="text-muted-foreground">{model.owningTeamName ?? '—'}</TableCell>
            <TableCell className="text-muted-foreground">{model.businessUnitName ?? '—'}</TableCell>
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
                    <Badge key={framework.id} variant="outline" className="text-xs">
                      {framework.name}
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
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/threat-models/${model.id}`)
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setModelToDelete(model)
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>

      <DeleteThreatModelDialog
        threatModel={modelToDelete}
        open={modelToDelete !== null}
        onOpenChange={(open) => !open && setModelToDelete(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </Table>
  )
}
