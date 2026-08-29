import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InlineEditableLabel } from './InlineEditableLabel'
import { STICKY_NOTE_COLOR_CONFIG, type StickyNoteNodeData } from '../../types'

type StickyNoteNodeType = Node<StickyNoteNodeData, 'stickyNote'>

const TEXT_ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const

const VERTICAL_ALIGN_CLASSES = {
  top: 'justify-start',
  middle: 'justify-center',
  bottom: 'justify-end',
} as const

const TEXT_SIZE_CLASSES = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
  extraLarge: 'text-lg',
} as const

const FONT_FAMILY_CLASSES = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
} as const

export const StickyNoteNode = memo(function StickyNoteNode({ id, data, selected }: NodeProps<StickyNoteNodeType>) {
  const colors = STICKY_NOTE_COLOR_CONFIG[data.noteColor || 'yellow']
  const textAlign = data.textAlign || 'left'
  const verticalAlign = data.verticalAlign || 'top'
  const textSize = data.textSize || 'medium'
  const fontFamily = data.fontFamily || 'sans'
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
        className={cn('relative flex h-full w-full flex-col rounded-sm border-2 p-3 shadow-sm transition-shadow', VERTICAL_ALIGN_CLASSES[verticalAlign], selected && 'shadow-md ring-2 ring-amber-300')}
        style={{
          backgroundColor: data.backgroundColor || colors.background,
          borderColor: data.borderColor || colors.border,
          color: data.textColor || colors.text,
        }}
      >
        <StickyNote className="absolute right-2 top-2 h-4 w-4 opacity-60" />
        <InlineEditableLabel
          nodeId={id}
          label={data.label}
          isEditing={data.isInlineEditing}
          className={cn(
            'block w-full max-w-[140px] whitespace-pre-line break-words',
            TEXT_ALIGN_CLASSES[textAlign],
            TEXT_SIZE_CLASSES[textSize],
            FONT_FAMILY_CLASSES[fontFamily],
            data.bold && 'font-bold',
            data.italic && 'italic',
            data.underline && 'underline'
          )}
          inputClassName={cn(
            'w-full',
            TEXT_ALIGN_CLASSES[textAlign],
            TEXT_SIZE_CLASSES[textSize],
            FONT_FAMILY_CLASSES[fontFamily],
            data.bold && 'font-bold',
            data.italic && 'italic',
            data.underline && 'underline'
          )}
        />
      </div>
    </>
  )
})
