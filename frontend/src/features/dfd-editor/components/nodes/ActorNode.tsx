import { memo, useEffect, useState } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { ActorNodeData } from '../../types'

type ActorNodeType = Node<ActorNodeData, 'actor'>

export const ActorNode = memo(function ActorNode({
  data,
  selected,
}: NodeProps<ActorNodeType>) {
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
      <Handle type="target" position={Position.Left} className="!bg-green-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-green-500 !w-3 !h-3" />

      <div
        className={cn(
          'flex flex-col items-center p-3 rounded-lg bg-green-50 border-2 min-w-[80px] transition-all',
          selected ? 'border-green-500 shadow-md' : 'border-green-200',
          isNewlyInserted && 'ring-2 ring-green-400 ring-offset-2',
          showLockAnimation && 'animate-lock-pulse ring-2 ring-orange-400 ring-offset-2'
        )}
      >
        {/* Stick figure */}
        <div className="flex flex-col items-center mb-2">
          {/* Head */}
          <div className="w-5 h-5 rounded-full border-2 border-green-600 bg-green-100" />
          {/* Body */}
          <div className="w-0.5 h-4 bg-green-600" />
          {/* Arms */}
          <div className="relative -mt-3">
            <div className="absolute w-6 h-0.5 bg-green-600 -left-3" />
          </div>
          {/* Legs */}
          <div className="flex mt-1">
            <div className="w-0.5 h-4 bg-green-600 rotate-[20deg] origin-top" />
            <div className="w-0.5 h-4 bg-green-600 -rotate-[20deg] origin-top -ml-0.5" />
          </div>
        </div>

        {/* Label */}
        <span className="font-medium text-sm text-green-900 text-center">
          {data.label}
        </span>
      </div>
    </>
  )
})
