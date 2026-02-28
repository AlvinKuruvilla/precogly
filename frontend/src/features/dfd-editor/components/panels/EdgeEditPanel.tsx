import { memo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { X, Trash2, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  DataFlowEdge,
  Protocol,
  DataClassification,
  DiagramNode,
  TrustZoneNodeData,
} from '../../types'
import { PROTOCOLS, DATA_CLASSIFICATIONS, TRUST_ZONE_TYPE_CONFIG } from '../../types'

interface EdgeEditPanelProps {
  edge: DataFlowEdge
  onClose: () => void
}

export const EdgeEditPanel = memo(function EdgeEditPanel({
  edge,
  onClose,
}: EdgeEditPanelProps) {
  const { setEdges, getNodes } = useReactFlow()

  const nodes = getNodes()
  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)

  const updateEdgeData = (updates: Partial<DataFlowEdge['data']>) => {
    setEdges((edges) =>
      edges.map((e) =>
        e.id === edge.id ? { ...e, data: { ...e.data, ...updates } } : e
      )
    )
  }

  const handleDelete = () => {
    setEdges((edges) => edges.filter((e) => e.id !== edge.id))
    onClose()
  }

  const handleReverseDirection = () => {
    setEdges((edges) =>
      edges.map((e) =>
        e.id === edge.id
          ? { ...e, source: edge.target, target: edge.source }
          : e
      )
    )
  }

  const toggleClassification = (classification: DataClassification) => {
    const current = edge.data?.dataClassification || []
    const updated = current.includes(classification)
      ? current.filter((c) => c !== classification)
      : [...current, classification]
    updateEdgeData({ dataClassification: updated })
  }

  return (
    <div className="w-80 bg-background border-l h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-gray-600" />
          <span className="font-medium">Data Flow</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connection info */}
        <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">From:</span>
            <span className="font-medium">
              {String(sourceNode?.data?.label || edge.source)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium">
              {String(targetNode?.data?.label || edge.target)}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleReverseDirection}
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Reverse Direction
        </Button>

        <Separator />

        {/* Label */}
        <div className="space-y-2">
          <Label htmlFor="edge-label">Label</Label>
          <Input
            id="edge-label"
            value={edge.data?.label || ''}
            onChange={(e) => updateEdgeData({ label: e.target.value })}
            placeholder="e.g., User credentials, API request..."
          />
        </div>

        {/* Protocol */}
        <div className="space-y-2">
          <Label htmlFor="edge-protocol">Protocol</Label>
          <Select
            value={edge.data?.protocol || ''}
            onValueChange={(value) => updateEdgeData({ protocol: value as Protocol })}
          >
            <SelectTrigger id="edge-protocol">
              <SelectValue placeholder="Select protocol..." />
            </SelectTrigger>
            <SelectContent>
              {PROTOCOLS.map((protocol) => (
                <SelectItem key={protocol} value={protocol}>
                  {protocol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Data Classification */}
        <div className="space-y-2">
          <Label>Data Classification</Label>
          <div className="grid grid-cols-2 gap-2">
            {DATA_CLASSIFICATIONS.map((classification) => (
              <div key={classification} className="flex items-center space-x-2">
                <Checkbox
                  id={`classification-${classification}`}
                  checked={edge.data?.dataClassification?.includes(classification) || false}
                  onCheckedChange={() => toggleClassification(classification)}
                />
                <Label
                  htmlFor={`classification-${classification}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {classification}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Security */}
        <div className="space-y-3">
          <Label>Security</Label>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edge-encrypted"
              checked={edge.data?.encrypted || false}
              onCheckedChange={(checked) =>
                updateEdgeData({ encrypted: checked as boolean })
              }
            />
            <Label
              htmlFor="edge-encrypted"
              className="text-sm font-normal cursor-pointer"
            >
              Encryption in Transit
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edge-authenticated"
              checked={edge.data?.authenticated || false}
              onCheckedChange={(checked) =>
                updateEdgeData({ authenticated: checked as boolean })
              }
            />
            <Label
              htmlFor="edge-authenticated"
              className="text-sm font-normal cursor-pointer"
            >
              Authentication Required
            </Label>
          </div>
        </div>

        <Separator />

        {/* Zone Crossing */}
        {(() => {
          const trustZones = (nodes as DiagramNode[]).filter(
            (n) => n.type === 'trustZone'
          )
          if (trustZones.length === 0) return null

          return (
            <div className="space-y-2">
              <Label htmlFor="edge-zone">Crosses Zone</Label>
              <Select
                value={edge.data?.crossesZoneId || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    updateEdgeData({
                      crossesZoneId: undefined,
                      crossesZoneLabel: undefined,
                      crossesZoneType: undefined,
                    })
                  } else {
                    const selectedZoneNode = trustZones.find((b) => b.id === value)
                    const selectedData = selectedZoneNode?.data as TrustZoneNodeData | undefined
                    updateEdgeData({
                      crossesZoneId: value,
                      crossesZoneLabel: selectedData?.label ? String(selectedData.label) : undefined,
                      crossesZoneType: selectedData?.zoneType,
                    })
                  }
                }}
              >
                <SelectTrigger id="edge-zone">
                  <SelectValue placeholder="Select zone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {trustZones.map((boundary) => {
                    const data = boundary.data as TrustZoneNodeData
                    const config = data.zoneType
                      ? TRUST_ZONE_TYPE_CONFIG[data.zoneType]
                      : null
                    return (
                      <SelectItem key={boundary.id} value={boundary.id}>
                        <div className="flex items-center gap-2">
                          {config && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: config.borderColor }}
                            />
                          )}
                          <span>{String(boundary.data.label)}</span>
                          {config && (
                            <span className="text-xs text-muted-foreground">
                              ({config.label})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )
        })()}

        {/* Edge info */}
        <Separator />

        <div className="space-y-1 text-xs text-muted-foreground">
          <div>ID: {edge.id}</div>
          <div>Type: {edge.type}</div>
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
          Delete Data Flow
        </Button>
      </div>
    </div>
  )
})
