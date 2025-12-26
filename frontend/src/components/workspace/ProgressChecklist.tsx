import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { ProgressChecklistItem } from '@/features/dfd-editor/types/threat-analysis'

interface ProgressChecklistProps {
  items: ProgressChecklistItem[]
  onToggle: (itemId: string, checked: boolean) => void
}

export function ProgressChecklist({ items, onToggle }: ProgressChecklistProps) {
  // Split items into two columns
  const midpoint = Math.ceil(items.length / 2)
  const leftColumn = items.slice(0, midpoint)
  const rightColumn = items.slice(midpoint)

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
      {/* Left column */}
      <div className="space-y-2">
        {leftColumn.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={onToggle}
          />
        ))}
      </div>
      {/* Right column */}
      <div className="space-y-2">
        {rightColumn.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}

function ChecklistItem({
  item,
  onToggle,
}: {
  item: ProgressChecklistItem
  onToggle: (itemId: string, checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={item.id}
        checked={item.checked}
        onCheckedChange={(checked) => onToggle(item.id, !!checked)}
        disabled={item.autoComputed}
        className={cn(
          item.autoComputed && 'cursor-default',
          item.checked && 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
        )}
      />
      <label
        htmlFor={item.id}
        className={cn(
          'text-sm cursor-pointer select-none',
          item.checked && 'text-green-700',
          item.autoComputed && 'cursor-default text-muted-foreground'
        )}
      >
        {item.label}
      </label>
    </div>
  )
}
