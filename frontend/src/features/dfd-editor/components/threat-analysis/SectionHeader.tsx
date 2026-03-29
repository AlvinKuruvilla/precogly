import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function SectionHeader({
  icon: Icon,
  label,
  count,
  isOpen,
  onClick,
  hasBorderTop = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  isOpen: boolean
  onClick: () => void
  hasBorderTop?: boolean
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center justify-between px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent',
        hasBorderTop && 'border-t'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {count}
        </Badge>
      </div>
      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
  )
}
