import { useCallback } from 'react'
import { useReactFlow, type XYPosition } from '@xyflow/react'
import type { DiagramNodeType } from '../types'
import { type DFDNotationStyle, NOTATION_NODE_SIZES } from '../types/notation'

const defaultData: Record<DiagramNodeType, Record<string, unknown>> = {
  humanActor: { label: 'New Human Actor' },
  systemActor: { label: 'New System Actor' },
  process: { label: 'New Process', technology: '' },
  datastore: { label: 'New Data Store', technology: '' },
  trustZone: { label: 'Trust Zone', trustLevel: 25, zoneColor: '#ef4444' },
  systemScope: { label: 'System Scope' },
}

export function useCreateNode(notationStyle: DFDNotationStyle) {
  const { addNodes, setNodes } = useReactFlow()
  const nodeSizes = NOTATION_NODE_SIZES[notationStyle]

  const createNode = useCallback(
    (type: DiagramNodeType, dropPosition: XYPosition) => {
      const nodeSize = nodeSizes[type] ?? { width: 120, height: 70 }

      const position = {
        x: dropPosition.x - nodeSize.width / 2,
        y: dropPosition.y - nodeSize.height / 2,
      }

      const id = `${type}-${Date.now()}`

      addNodes({
        id,
        type,
        position,
        data: { ...defaultData[type], isNewlyInserted: true, isInlineEditing: true },
        style: { width: nodeSize.width, height: nodeSize.height },
      })

      setTimeout(() => {
        setNodes((currentNodes) =>
          currentNodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, isNewlyInserted: false } } : n
          )
        )
      }, 2000)

      return id
    },
    [addNodes, setNodes, nodeSizes]
  )

  return { createNode }
}
