import { memo, useEffect, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DataStoreNodeData } from '@/types'
import { DATA_SENSITIVITY_CONFIG } from '@/types'

export const DataStoreNode = memo(function DataStoreNode({
  data,
  selected,
}: NodeProps<DataStoreNodeData>) {
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
      {/* Left = inbound data flows, Right = outbound data flows */}
      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3 !h-3" />

      <div
        className={cn(
          'relative min-w-[120px] transition-all',
          isNewlyInserted && 'ring-2 ring-green-400 ring-offset-2 rounded-lg',
          showLockAnimation && 'animate-lock-pulse ring-2 ring-orange-400 ring-offset-2 rounded-lg'
        )}
      >
        {/* Cylinder shape using CSS */}
        <div
          className={cn(
            'relative bg-purple-50 border-2 rounded-lg overflow-hidden',
            selected ? 'border-purple-500 shadow-md' : 'border-purple-200'
          )}
        >
          {/* Top ellipse */}
          <div className="h-3 bg-purple-100 border-b border-purple-200 rounded-t-lg" />

          {/* Body */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm text-purple-900 truncate">
                  {data.label}
                </span>
                {data.technology && (
                  <span className="text-xs text-purple-600 truncate">
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

          {/* Bottom ellipse */}
          <div className="h-3 bg-purple-100 border-t border-purple-200 rounded-b-lg" />
        </div>
      </div>
    </>
  )
})
