import { memo } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrustBoundaryNodeData } from '@/types'
import { TRUST_LEVEL_CONFIG } from '@/types'

export const TrustBoundaryNode = memo(function TrustBoundaryNode({
  data,
  selected,
}: NodeProps<TrustBoundaryNodeData>) {
  const isNewlyInserted = data.isNewlyInserted
  const trustConfig = TRUST_LEVEL_CONFIG[data.trustLevel] || TRUST_LEVEL_CONFIG.internal

  return (
    <>
      {/* Resizer for adjusting boundary size */}
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-dashed"
        handleClassName="!w-2 !h-2 !rounded-sm"
        lineStyle={{ borderColor: trustConfig.borderColor }}
        handleStyle={{ backgroundColor: trustConfig.borderColor, borderColor: trustConfig.borderColor }}
      />

      {/* Handles for connections (boundaries can also have connections) */}
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />

      <div
        className={cn(
          'w-full h-full rounded-lg border-2 border-dashed transition-all',
          isNewlyInserted && 'ring-2 ring-green-400 ring-offset-2'
        )}
        style={{
          backgroundColor: trustConfig.color,
          borderColor: trustConfig.borderColor,
        }}
      >
        {/* Label badge at top-left */}
        <div
          className="absolute -top-3 left-3 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"
          style={{
            backgroundColor: trustConfig.borderColor,
            color: 'white',
          }}
        >
          <Shield className="h-3 w-3" />
          {data.label}
        </div>

        {/* Trust level indicator */}
        <div
          className="absolute -top-3 right-3 px-2 py-0.5 rounded text-xs"
          style={{
            backgroundColor: 'white',
            color: trustConfig.borderColor,
            border: `1px solid ${trustConfig.borderColor}`,
          }}
        >
          {trustConfig.label}
        </div>
      </div>
    </>
  )
})
