/**
 * Undo History Hook
 *
 * A modular hook for managing undo functionality in the DFD editor.
 * Can be easily removed by:
 * 1. Deleting this file
 * 2. Removing the import and usage from useDiagramState.ts
 * 3. Removing the undo keyboard shortcut from useKeyboardShortcuts.ts
 */

import { useCallback, useRef } from 'react'
import type { DiagramNode, DataFlowEdge } from '../types'

interface HistoryState {
  nodes: DiagramNode[]
  edges: DataFlowEdge[]
}

interface UseUndoHistoryOptions {
  maxHistorySize?: number
}

interface UseUndoHistoryReturn {
  /** Push current state to history (call before making changes) */
  pushToHistory: (state: HistoryState) => void
  /** Undo to previous state, returns the state to restore or null if no history */
  undo: () => HistoryState | null
  /** Check if undo is available */
  canUndo: () => boolean
  /** Clear all history */
  clearHistory: () => void
}

export function useUndoHistory({
  maxHistorySize = 30,
}: UseUndoHistoryOptions = {}): UseUndoHistoryReturn {
  const historyRef = useRef<HistoryState[]>([])

  const pushToHistory = useCallback(
    (state: HistoryState) => {
      // Deep clone to avoid reference issues
      const clonedState: HistoryState = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      }

      historyRef.current.push(clonedState)

      // Cap history size
      if (historyRef.current.length > maxHistorySize) {
        historyRef.current.shift()
      }
    },
    [maxHistorySize]
  )

  const undo = useCallback((): HistoryState | null => {
    if (historyRef.current.length === 0) {
      return null
    }

    const previousState = historyRef.current.pop()
    return previousState || null
  }, [])

  const canUndo = useCallback(() => {
    return historyRef.current.length > 0
  }, [])

  const clearHistory = useCallback(() => {
    historyRef.current = []
  }, [])

  return {
    pushToHistory,
    undo,
    canUndo,
    clearHistory,
  }
}
