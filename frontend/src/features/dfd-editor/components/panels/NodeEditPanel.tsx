import { memo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { X, Trash2, Cog, Database, User, Server, Shield, Box, ShieldCheck, ArrowRight } from 'lucide-react'
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
import { useThreatModelSystems, useUpdateComponentSystem } from '@/api/threat-models'
import type {
  DiagramNode,
  DiagramNodeType,
  TrustLevel,
  TrustZoneType,
  DataSensitivity,
} from '../../types'
import {
  TRUST_LEVEL_CONFIG,
  DATA_SENSITIVITY_CONFIG,
  TRUST_ZONE_TYPE_CONFIG,
} from '../../types'

interface NodeEditPanelProps {
  node: DiagramNode
  onClose: () => void
  threatModelId?: string
}

const nodeTypeConfig: Record<
  DiagramNodeType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  process: { label: 'Process', icon: Cog, color: 'text-blue-600' },
  datastore: { label: 'Data Store', icon: Database, color: 'text-purple-600' },
  humanActor: { label: 'Human Actor', icon: User, color: 'text-green-600' },
  systemActor: { label: 'System Actor', icon: Server, color: 'text-slate-600' },
  trustZone: { label: 'Trust Zone', icon: Shield, color: 'text-orange-600' },
  systemScope: { label: 'System Scope', icon: Box, color: 'text-gray-600' },
}

export const NodeEditPanel = memo(function NodeEditPanel({
  node,
  onClose,
  threatModelId,
}: NodeEditPanelProps) {
  const { setNodes, getNodes, getEdges, setEdges } = useReactFlow()

  // Get linked systems for this threat model
  const { systems: linkedSystems, hasLinkedSystems } = useThreatModelSystems(threatModelId)
  const updateComponentSystemMutation = useUpdateComponentSystem()

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

    // For boundary nodes, convert children to root nodes
    if (node.type === 'trustZone' || node.type === 'systemScope') {
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
            placeholder={node.type === 'trustZone' ? 'e.g., Production VPC, DMZ...' : 'Enter name...'}
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

            {/* System Assignment - only shown if threat model has linked systems */}
            {hasLinkedSystems && (node.data as { component_id?: number }).component_id && (
              <div className="space-y-2">
                <Label htmlFor="node-system">System</Label>
                <Select
                  value={(node.data as { orgsystemId?: number }).orgsystemId?.toString() || 'none'}
                  onValueChange={(value) => {
                    const componentId = (node.data as { component_id?: number }).component_id
                    if (componentId) {
                      const orgsystemId = value === 'none' ? null : parseInt(value, 10)
                      updateNodeData({ orgsystemId: orgsystemId ?? undefined })
                      updateComponentSystemMutation.mutate({
                        componentId,
                        orgsystemId,
                      })
                    }
                  }}
                >
                  <SelectTrigger id="node-system">
                    <SelectValue placeholder="Not assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {linkedSystems.map((system) => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign this component to a linked system
                </p>
              </div>
            )}
          </>
        )}

        {node.type === 'trustZone' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="node-zoneType">Zone Type</Label>
              <Select
                value={(node.data as { zoneType?: TrustZoneType }).zoneType || ''}
                onValueChange={(value) =>
                  updateNodeData({ zoneType: value as TrustZoneType })
                }
              >
                <SelectTrigger id="node-zoneType">
                  <SelectValue placeholder="Select zone type..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRUST_ZONE_TYPE_CONFIG) as TrustZoneType[]).map((type) => {
                    const config = TRUST_ZONE_TYPE_CONFIG[type]
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: config.borderColor }}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {(node.data as { zoneType?: TrustZoneType }).zoneType && (
                <p className="text-xs text-muted-foreground">
                  {TRUST_ZONE_TYPE_CONFIG[(node.data as { zoneType: TrustZoneType }).zoneType]?.description}
                </p>
              )}
            </div>

            {/* Legacy trust level (for backward compatibility) */}
            {!(node.data as { zoneType?: TrustZoneType }).zoneType && (
              <div className="space-y-2">
                <Label htmlFor="node-trustLevel">Trust Level (Legacy)</Label>
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
            )}

            <div className="space-y-2">
              <Label>Technology</Label>
              <TechnologyCombobox
                value={(node.data as { technology?: string }).technology || ''}
                onChange={(value) => updateNodeData({ technology: value })}
                filterNodeType="trustZone"
                placeholder="Select networking/security..."
              />
            </div>

            {/* Trust Boundaries (read-only) */}
            {(() => {
              const allEdges = getEdges()
              const boundaryEdges = allEdges.filter(
                (e) =>
                  e.type === 'trustBoundary' &&
                  (e.source === node.id || e.target === node.id)
              )
              if (boundaryEdges.length === 0) return null
              const allNodes = getNodes()
              return (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-orange-600" />
                      Trust Boundaries
                    </Label>
                    <div className="space-y-1">
                      {boundaryEdges.map((boundaryEdge) => {
                        const isSource = boundaryEdge.source === node.id
                        const otherNodeId = isSource ? boundaryEdge.target : boundaryEdge.source
                        const otherNode = allNodes.find((n) => n.id === otherNodeId)
                        const otherLabel = otherNode?.data?.label
                          ? String(otherNode.data.label)
                          : otherNodeId
                        return (
                          <div
                            key={boundaryEdge.id}
                            className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm"
                          >
                            <ArrowRight
                              className={`h-3 w-3 text-orange-600 ${isSource ? '' : 'rotate-180'}`}
                            />
                            <span className="text-muted-foreground">
                              {isSource ? 'To' : 'From'}:
                            </span>
                            <span className="font-medium">{otherLabel}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )
            })()}
          </>
        )}

        {node.type === 'systemActor' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="node-systemType">System Type</Label>
              <Select
                value={(node.data as { systemType?: string }).systemType || ''}
                onValueChange={(value) => updateNodeData({ systemType: value })}
              >
                <SelectTrigger id="node-systemType">
                  <SelectValue placeholder="Select system type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">Third-party API</SelectItem>
                  <SelectItem value="legacy">Legacy System</SelectItem>
                  <SelectItem value="partner">Partner System</SelectItem>
                  <SelectItem value="thirdParty">Third-party Service</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-vendor">Vendor</Label>
              <Input
                id="node-vendor"
                value={(node.data as { vendor?: string }).vendor || ''}
                onChange={(e) => updateNodeData({ vendor: e.target.value })}
                placeholder="e.g., Stripe, Twilio..."
              />
            </div>
          </>
        )}

        {node.type === 'systemScope' && (
          <>
            <div className="space-y-2">
              <Label>Technology</Label>
              <TechnologyCombobox
                value={(node.data as { technology?: string }).technology || ''}
                onChange={(value) => updateNodeData({ technology: value })}
                filterNodeType="systemScope"
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
                {parentNode.type === 'trustZone' ? (
                  <Shield className="h-4 w-4 text-orange-600" />
                ) : (
                  <Box className="h-4 w-4 text-gray-600" />
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
