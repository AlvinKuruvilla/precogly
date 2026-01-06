import { memo, useEffect, useState } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Cog } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcessNodeData } from '../../types'
import { DATA_SENSITIVITY_CONFIG } from '../../types'

type ProcessNodeType = Node<ProcessNodeData, 'process'>

export const ProcessNode = memo(function ProcessNode({
  data,
  selected,
}: NodeProps<ProcessNodeType>) {
  const isNewlyInserted = data.isNewlyInserted
  const [showLockAnimation, setShowLockAnimation] = useState(false)

  // Trigger lock animation when lockAnimationKey changes (new timestamp = new animation)
  useEffect(() => {
    if (data.lockAnimationKey) {
      setShowLockAnimation(true)
      const timer = setTimeout(() => setShowLockAnimation(false), 500)
      return () => clearTimeout(timer)
    }
  }, [data.lockAnimationKey])

  return (
    <>
      {/* Handles on all 4 sides for flexible edge routing */}
      {/* Top */}
      <Handle id="top-target" type="target" position={Position.Top} className="!bg-blue-500 !w-2 !h-2 !min-w-0 !min-h-0" />
      <Handle id="top-source" type="source" position={Position.Top} className="!bg-blue-500 !w-2 !h-2 !min-w-0 !min-h-0" />
      {/* Right */}
      <Handle id="right-target" type="target" position={Position.Right} className="!bg-blue-500 !w-2 !h-2 !min-w-0 !min-h-0" />
      <Handle id="right-source" type="source" position={Position.Right} className="!bg-blue-500 !w-2 !h-2 !min-w-0 !min-h-0" />
      {/* Bottom */}
      <Handle id="bottom-target" type="target" position={Position.Bottom} className="!bg-blue-500 !w-2 !h-2 !min-w-0 !min-h-0" />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="!bg-blue-500 !w-2 !h-2 !min-w-0 !min-h-0" />
      {/* Left */}
      <Handle id="left-target" type="target" position={Position.Left} className="!bg-blue-500 !w-2 !h-2 !min-w-0 !min-h-0" />
      <Handle id="left-source" type="source" position={Position.Left} className="!bg-blue-500 !w-2 !h-2 !min-w-0 !min-h-0" />

      <div
        className={cn(
          'px-4 py-3 rounded-lg bg-blue-50 border-2 min-w-[120px] transition-all',
          selected ? 'border-blue-500 shadow-md' : 'border-blue-200',
          isNewlyInserted && 'ring-2 ring-green-400 ring-offset-2',
          showLockAnimation && 'animate-lock-pulse ring-2 ring-orange-400 ring-offset-2'
        )}
      >
        <div className="flex items-center gap-2">
          <Cog className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm text-blue-900 truncate">
              {data.label}
            </span>
            {data.technology && (
              <span className="text-xs text-blue-600 truncate">
                {data.technology}
              </span>
            )}
          </div>
        </div>
        {data.dataSensitivity && (
          <div
            className="mt-2 text-xs px-1.5 py-0.5 rounded text-center"
            style={{
              backgroundColor: `${DATA_SENSITIVITY_CONFIG[data.dataSensitivity].color}20`,
              color: DATA_SENSITIVITY_CONFIG[data.dataSensitivity].color,
            }}
          >
            {DATA_SENSITIVITY_CONFIG[data.dataSensitivity].label}
          </div>
        )}
      </div>
    </>
  )
})
