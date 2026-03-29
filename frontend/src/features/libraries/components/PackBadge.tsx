/**
 * Badge showing the source pack for a library item.
 */

import { Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PackBadgeProps {
  packName?: string | null
  packSlug?: string | null
}

export function PackBadge({ packName }: PackBadgeProps) {
  if (!packName) return null

  return (
    <Badge variant="outline" className="gap-1 text-xs font-normal">
      <Package className="h-3 w-3" />
      {packName}
    </Badge>
  )
}
