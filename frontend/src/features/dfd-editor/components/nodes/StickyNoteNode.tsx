import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InlineEditableLabel } from './InlineEditableLabel'
import type { StickyNoteNodeData, StickyNoteColor, StickyNoteTextSize } from '../../types'

type StickyNoteNodeType = Node<StickyNoteNodeData, 'stickyNote'>

const NOTE_COLORS: Record<StickyNoteColor, { background: string; border: string; text: string }> = {
  yellow: { background: '#fef9c3', border: '#eab308', text: '#713f12' },
  blue: { background: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
  green: { background: '#dcfce7', border: '#22c55e', text: '#14532d' },
  pink: { background: '#fce7f3', border: '#ec4899', text: '#831843' },
  orange: { background: '#ffedd5', border: '#f97316', text: '#7c2d12' },
}

const TEXT_SIZE_CLASSES: Record<StickyNoteTextSize, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
}

export const StickyNoteNode = memo(function StickyNoteNode({ id, data, selected }: NodeProps<StickyNoteNodeType>) {
  const colors = NOTE_COLORS[data.noteColor || 'yellow']
  const textSize = data.textSize || 'medium'
  const handleClass = '!w-2 !h-2 !min-w-0 !min-h-0'

  return (
    <>
      <Handle id="top-target" type="target" position={Position.Top} className={cn(handleClass, '!bg-amber-500')} />
      <Handle id="top-source" type="source" position={Position.Top} className={cn(handleClass, '!bg-amber-500')} />
      <Handle id="right-target" type="target" position={Position.Right} className={cn(handleClass, '!bg-amber-500')} />
      <Handle id="right-source" type="source" position={Position.Right} className={cn(handleClass, '!bg-amber-500')} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} className={cn(handleClass, '!bg-amber-500')} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className={cn(handleClass, '!bg-amber-500')} />
      <Handle id="left-target" type="target" position={Position.Left} className={cn(handleClass, '!bg-amber-500')} />
      <Handle id="left-source" type="source" position={Position.Left} className={cn(handleClass, '!bg-amber-500')} />
      <div
        className={cn('relative h-full w-full rounded-sm border-2 p-3 shadow-sm transition-shadow', selected && 'shadow-md ring-2 ring-amber-300')}
        style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
      >
        <StickyNote className="absolute right-2 top-2 h-4 w-4 opacity-60" />
        <InlineEditableLabel
          nodeId={id}
          label={data.label}
          isEditing={data.isInlineEditing}
          className={cn('block max-w-[140px] whitespace-pre-line break-words', TEXT_SIZE_CLASSES[textSize], data.bold && 'font-bold', data.italic && 'italic')}
          inputClassName={cn('w-full', TEXT_SIZE_CLASSES[textSize], data.bold && 'font-bold', data.italic && 'italic')}
        />
      </div>
    </>
  )
})
