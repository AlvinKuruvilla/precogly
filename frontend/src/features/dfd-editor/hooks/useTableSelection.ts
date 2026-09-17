import { useCallback, useState } from 'react'
import type { TableCellRange } from '../types'

/**
 * Which cells of a table are selected, and the pointer gestures that choose
 * them: click one, drag for a rectangle, click a grip for a whole row or
 * column.
 *
 * There is no shift-click to extend, though every spreadsheet has one. Shift is
 * React Flow's `selectionKeyCode`, and while it is held a pointerdown on a cell
 * never reaches this component — measured on the guest canvas: Alt and Meta get
 * through, Shift does not. Restoring it means passing `selectionKeyCode={null}`
 * to the ReactFlow in DFDEditor and GuestDFDEditor, which costs the one thing
 * Shift does on that canvas: starting a selection box from on top of a node
 * instead of moving that node. Dragging already selects any rectangle, so
 * nothing is unreachable without it.
 *
 * The gesture is two-stage, as it is in Miro. An unselected table drags from
 * anywhere in its body like every other node; only once it is selected does a
 * press on a cell belong to the table, and the table is then moved by dragging
 * a grip instead. TableNode enforces that by putting React Flow's `nodrag`
 * class on the cells only while the node is selected, and calling
 * `beginCellSelection` under the same condition.
 */

/**
 * Pointer travel, in screen pixels, past which a press on a cell is a range
 * drag rather than a click on that one cell.
 *
 * Arbitrary, within the band every drag-versus-click UI uses. Lower and a click
 * from an unsteady hand selects two cells; higher and a deliberate drag stops
 * picking up the next cell until the pointer is well inside it.
 */
export const TABLE_DRAG_THRESHOLD = 3

interface CellRef {
  row: number
  col: number
}

function rangeBetween(a: CellRef, b: CellRef): TableCellRange {
  return {
    top: Math.min(a.row, b.row),
    bottom: Math.max(a.row, b.row),
    left: Math.min(a.col, b.col),
    right: Math.max(a.col, b.col),
  }
}

/**
 * Find the cell under the pointer by asking the DOM, rather than by measuring
 * columns and rows and doing the arithmetic.
 *
 * A row's rendered height is not knowable from the data — `minmax(h, auto)`
 * lets it grow to fit wrapped text — so there is no sum to walk. Hit-testing
 * also gets zoom and pan for free.
 *
 * `elementsFromPoint` rather than `elementFromPoint`: the divider drag strips
 * are `pointer-events-auto` and overlay the cells near every column and row
 * edge, so the topmost element is often a divider. The cell is further down the
 * same stack. The table id is checked because two tables can overlap, and a
 * drag must not run off into the cells of the one underneath.
 */
function cellFromPoint(tableId: string, x: number, y: number): CellRef | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const { tableId: id, tableCell } = (element as HTMLElement).dataset ?? {}
    if (!tableCell || id !== tableId) continue
    const [row, col] = tableCell.split(',').map(Number)
    return { row, col }
  }
  return null
}

export interface TableSelection {
  /** The selected rectangle of cells, or null when nothing is selected. */
  range: TableCellRange | null
  /**
   * Which axis the range covers, set only when it came from a grip.
   *
   * This is what lets Delete remove a row or column rather than clear cells.
   * Deriving it from the range instead — one spanning every column is a row —
   * breaks in a one-column table, where every single-cell selection spans every
   * column too, and Delete would take the whole row out.
   */
  axis: 'row' | 'column' | null
  /** Press on a cell. Only called while the table node is already selected. */
  beginCellSelection: (row: number, col: number, event: React.PointerEvent) => void
  /** Select a whole row or column, as clicking its grip does. */
  selectAxis: (axis: 'row' | 'column', index: number) => void
  /**
   * Move the selection onto one cell unless it already covers it, so a
   * right-click acts on what was clicked. Sheets and Excel both do this: a
   * right-click inside a selection keeps it, one outside replaces it.
   */
  selectUnlessInside: (row: number, col: number) => void
  clear: () => void
}

export function useTableSelection(
  tableId: string,
  rowCount: number,
  columnCount: number
): TableSelection {
  const [range, setRange] = useState<TableCellRange | null>(null)
  const [axis, setAxis] = useState<'row' | 'column' | null>(null)

  const clear = useCallback(() => {
    setRange(null)
    setAxis(null)
  }, [])

  const selectAxis = useCallback(
    (which: 'row' | 'column', index: number) => {
      setAxis(which)
      setRange(
        which === 'column'
          ? { top: 0, bottom: rowCount - 1, left: index, right: index }
          : { top: index, bottom: index, left: 0, right: columnCount - 1 }
      )
    },
    [columnCount, rowCount]
  )

  const selectUnlessInside = useCallback((row: number, col: number) => {
    setRange((current) => {
      if (
        current &&
        row >= current.top &&
        row <= current.bottom &&
        col >= current.left &&
        col <= current.right
      ) {
        return current
      }
      setAxis(null)
      return { top: row, bottom: row, left: col, right: col }
    })
  }, [])

  const beginCellSelection = useCallback(
    (row: number, col: number, event: React.PointerEvent) => {
      // Right-click opens the context menu and must not start a selection drag;
      // the menu's own trigger has already handled it.
      if (event.button !== 0) return

      // Keeps the press away from React Flow's own React-level handlers. It is
      // not what stops the node being dragged — that is the `nodrag` class
      // TableNode puts on a selected table's cells, because React Flow drags
      // from a native listener that has already run by the time this fires.
      event.stopPropagation()

      // The pressed cell is both the selection and the corner a drag grows from.
      const anchor = { row, col }
      setAxis(null)
      setRange({ top: row, bottom: row, left: col, right: col })

      const startX = event.clientX
      const startY = event.clientY
      let dragging = false

      const handleMove = (moveEvent: PointerEvent) => {
        if (
          !dragging &&
          Math.abs(moveEvent.clientX - startX) < TABLE_DRAG_THRESHOLD &&
          Math.abs(moveEvent.clientY - startY) < TABLE_DRAG_THRESHOLD
        ) {
          return
        }
        dragging = true

        // No cell under the pointer means it has left the table. The range
        // keeps its last value rather than collapsing, so drifting off an edge
        // mid-drag and coming back does not lose the selection.
        const over = cellFromPoint(tableId, moveEvent.clientX, moveEvent.clientY)
        if (over) setRange(rangeBetween(anchor, over))
      }

      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [tableId]
  )

  return { range, axis, beginCellSelection, selectAxis, selectUnlessInside, clear }
}
