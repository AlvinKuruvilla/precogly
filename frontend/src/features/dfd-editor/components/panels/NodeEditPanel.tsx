import { memo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { X, Trash2, Cog, Database, User, Shield, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TechnologyCombobox } from '../technology-combobox'
import type {
  DiagramNode,
  DiagramNodeType,
  TrustLevel,
  DataSensitivity,
} from '../../types'
import { TRUST_LEVEL_CONFIG, DATA_SENSITIVITY_CONFIG } from '../../types'

interface NodeEditPanelProps {
  node: DiagramNode
  onClose: () => void
}

const nodeTypeConfig: Record<
  DiagramNodeType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  process: { label: 'Process', icon: Cog, color: 'text-blue-600' },
  datastore: { label: 'Data Store', icon: Database, color: 'text-purple-600' },
  actor: { label: 'Actor', icon: User, color: 'text-green-600' },
  trustBoundary: { label: 'Trust Boundary', icon: Shield, color: 'text-orange-600' },
  systemBoundary: { label: 'System Boundary', icon: Box, color: 'text-slate-600' },
}

export const NodeEditPanel = memo(function NodeEditPanel({
  node,
  onClose,
}: NodeEditPanelProps) {
  const { setNodes, getNodes, getEdges, setEdges } = useReactFlow()

  const typeConfig = nodeTypeConfig[node.type as DiagramNodeType]
  const Icon = typeConfig?.icon || Cog

  // Find parent node if exists
  const parentNode = node.parentId
    ? (getNodes() as DiagramNode[]).find((n) => n.id === node.parentId)
    : null

  const updateNodeData = (updates: Partial<DiagramNode['data']>) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, ...updates } } : n
      )
    )
  }

  const handleDelete = () => {
    const nodes = getNodes() as DiagramNode[]
    const edges = getEdges()

    // For boundary nodes, convert children to root nodes
    if (node.type === 'trustBoundary' || node.type === 'systemBoundary') {
      const boundaryPos = node.position
      const updatedNodes = nodes
        .filter((n) => n.id !== node.id)
        .map((n) => {
          if (n.parentId === node.id) {
            return {
              ...n,
              parentId: undefined,
              position: {
                x: n.position.x + boundaryPos.x,
                y: n.position.y + boundaryPos.y,
              },
            }
          }
          return n
        })
      setNodes(updatedNodes)
    } else {
      setNodes((nodes) => nodes.filter((n) => n.id !== node.id))
    }

    // Remove connected edges
    setEdges((edges) =>
      edges.filter((e) => e.source !== node.id && e.target !== node.id)
    )

    onClose()
  }

  return (
    <div className="w-80 bg-background border-l h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${typeConfig?.color}`} />
          <span className="font-medium">{typeConfig?.label || 'Node'}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Common fields */}
        <div className="space-y-2">
          <Label htmlFor="node-label">Name</Label>
          <Input
            id="node-label"
            value={node.data.label || ''}
            onChange={(e) => updateNodeData({ label: e.target.value })}
            placeholder="Enter name..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="node-description">Description</Label>
          <Textarea
            id="node-description"
            value={node.data.description || ''}
            onChange={(e) => updateNodeData({ description: e.target.value })}
            placeholder="Enter description..."
            rows={3}
          />
        </div>

        <Separator />

        {/* Type-specific fields */}
        {(node.type === 'process' || node.type === 'datastore') && (
          <>
            <div className="space-y-2">
              <Label>Technology</Label>
              <TechnologyCombobox
                value={(node.data as { technology?: string }).technology || ''}
                onChange={(value) => updateNodeData({ technology: value })}
                filterNodeType={node.type as 'process' | 'datastore'}
                placeholder={
                  node.type === 'datastore'
                    ? 'Select storage/database...'
                    : 'Select compute/backend...'
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-sensitivity">Data Sensitivity</Label>
              <Select
                value={(node.data as { dataSensitivity?: DataSensitivity }).dataSensitivity || ''}
                onValueChange={(value) =>
                  updateNodeData({ dataSensitivity: value as DataSensitivity })
                }
              >
                <SelectTrigger id="node-sensitivity">
                  <SelectValue placeholder="Select sensitivity..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DATA_SENSITIVITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {node.type === 'trustBoundary' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="node-trustLevel">Trust Level</Label>
              <Select
                value={(node.data as { trustLevel?: TrustLevel }).trustLevel || 'internal'}
                onValueChange={(value) =>
                  updateNodeData({ trustLevel: value as TrustLevel })
                }
              >
                <SelectTrigger id="node-trustLevel">
                  <SelectValue placeholder="Select trust level..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRUST_LEVEL_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: config.borderColor }}
                        />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Technology</Label>
              <TechnologyCombobox
                value={(node.data as { technology?: string }).technology || ''}
                onChange={(value) => updateNodeData({ technology: value })}
                filterNodeType="trustBoundary"
                placeholder="Select networking/security..."
              />
            </div>
          </>
        )}

        {node.type === 'systemBoundary' && (
          <>
            <div className="space-y-2">
              <Label>Technology</Label>
              <TechnologyCombobox
                value={(node.data as { technology?: string }).technology || ''}
                onChange={(value) => updateNodeData({ technology: value })}
                filterNodeType="systemBoundary"
                placeholder="Select infrastructure..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-owner">Owner</Label>
              <Input
                id="node-owner"
                value={(node.data as { owner?: string }).owner || ''}
                onChange={(e) => updateNodeData({ owner: e.target.value })}
                placeholder="Team or person responsible..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-classification">Classification</Label>
              <Input
                id="node-classification"
                value={(node.data as { classification?: string }).classification || ''}
                onChange={(e) => updateNodeData({ classification: e.target.value })}
                placeholder="e.g., Internal, External..."
              />
            </div>
          </>
        )}

        {/* Parent info */}
        {parentNode && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-muted-foreground">Contained In</Label>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                {parentNode.type === 'trustBoundary' ? (
                  <Shield className="h-4 w-4 text-orange-600" />
                ) : (
                  <Box className="h-4 w-4 text-slate-600" />
                )}
                <span className="text-sm font-medium">{parentNode.data.label}</span>
              </div>
            </div>
          </>
        )}

        {/* Node info */}
        <Separator />

        <div className="space-y-1 text-xs text-muted-foreground">
          <div>ID: {node.id}</div>
          <div>Type: {node.type}</div>
        </div>
      </div>

      {/* Footer with delete */}
      <div className="p-4 border-t">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </div>
  )
})
