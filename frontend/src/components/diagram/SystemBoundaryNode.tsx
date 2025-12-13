import { memo, useState } from 'react'
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react'
import { Box, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { SystemBoundaryNodeData, DiagramNode } from '@/types'

// Need to add AlertDialog component
export const SystemBoundaryNode = memo(function SystemBoundaryNode({
  id,
  data,
  selected,
}: NodeProps<SystemBoundaryNodeData>) {
  const isNewlyInserted = data.isNewlyInserted
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { getNodes, setNodes, setEdges, getEdges } = useReactFlow()

  const handleDelete = () => {
    const nodes = getNodes() as DiagramNode[]
    const edges = getEdges()

    // Find child nodes (nodes whose parentId is this boundary)
    const childNodes = nodes.filter((n) => n.parentId === id)

    // Convert children to root nodes with absolute positions
    const updatedNodes = nodes
      .filter((n) => n.id !== id)
      .map((node) => {
        if (node.parentId === id) {
          // Get this boundary's position to calculate absolute position
          const boundary = nodes.find((n) => n.id === id)
          const boundaryPos = boundary?.position || { x: 0, y: 0 }
          return {
            ...node,
            parentId: undefined,
            position: {
              x: node.position.x + boundaryPos.x,
              y: node.position.y + boundaryPos.y,
            },
          }
        }
        return node
      })

    // Remove edges connected to this boundary
    const updatedEdges = edges.filter(
      (e) => e.source !== id && e.target !== id
    )

    setNodes(updatedNodes)
    setEdges(updatedEdges)
    setShowDeleteDialog(false)
  }

  return (
    <>
      {/* Resizer for adjusting boundary size */}
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-solid"
        handleClassName="!w-2 !h-2 !rounded-sm"
        lineStyle={{ borderColor: '#64748b' }}
        handleStyle={{ backgroundColor: '#64748b', borderColor: '#64748b' }}
      />

      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />

      <div
        className={cn(
          'w-full h-full rounded-lg border-2 border-solid bg-slate-50/50 transition-all',
          selected ? 'border-slate-500' : 'border-slate-300',
          isNewlyInserted && 'ring-2 ring-green-400 ring-offset-2'
        )}
      >
        {/* Label badge at top-left */}
        <div className="absolute -top-3 left-3 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 bg-slate-600 text-white">
          <Box className="h-3 w-3" />
          {data.label}
        </div>

        {/* Delete button (only visible when selected) */}
        {selected && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-3 right-3 h-6 w-6"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}

        {/* Owner/Classification info */}
        {(data.owner || data.classification) && (
          <div className="absolute bottom-2 left-2 text-xs text-slate-500">
            {data.owner && <div>Owner: {data.owner}</div>}
            {data.classification && <div>Class: {data.classification}</div>}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete System Boundary</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this system boundary? Child nodes
              will be converted to root nodes and preserved on the canvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})
