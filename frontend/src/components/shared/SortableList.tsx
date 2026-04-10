import { type ReactNode, useCallback } from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable, isSortable } from '@dnd-kit/react/sortable'

interface SortableItemProps<T> {
  item: T
  itemId: string | number
  index: number
  renderItem: (
    item: T,
    dragHandleRef: React.RefCallback<HTMLElement>,
    isDragging: boolean
  ) => ReactNode
}

function SortableItem<T>({ item, itemId, index, renderItem }: SortableItemProps<T>) {
  const { ref, handleRef, isDragging } = useSortable({ id: itemId, index })

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
      {renderItem(item, handleRef, isDragging)}
    </div>
  )
}

interface SortableListProps<T> {
  items: T[]
  getItemId: (item: T) => string | number
  renderItem: (
    item: T,
    dragHandleRef: React.RefCallback<HTMLElement>,
    isDragging: boolean
  ) => ReactNode
  onReorder: (reorderedItems: T[]) => void
}

export function SortableList<T>({
  items,
  getItemId,
  renderItem,
  onReorder,
}: SortableListProps<T>) {
  const handleDragEnd = useCallback(
    (event: Parameters<NonNullable<React.ComponentProps<typeof DragDropProvider>['onDragEnd']>>[0]) => {
      if (event.canceled) return

      const { source } = event.operation
      if (!isSortable(source)) return

      const { initialIndex, index } = source
      if (initialIndex === index) return

      const reordered = [...items]
      const [removed] = reordered.splice(initialIndex, 1)
      reordered.splice(index, 0, removed)
      onReorder(reordered)
    },
    [items, onReorder]
  )

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      {items.map((item, index) => (
        <SortableItem
          key={getItemId(item)}
          item={item}
          itemId={getItemId(item)}
          index={index}
          renderItem={renderItem}
        />
      ))}
    </DragDropProvider>
  )
}
