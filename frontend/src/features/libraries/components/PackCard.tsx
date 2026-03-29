/**
 * Card component for displaying a library pack.
 */

import { Check, Download, Eye, Package } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { LibraryPackListItem } from '@/features/libraries/types/packs'

interface PackCardProps {
  pack: LibraryPackListItem
  onImport: (pack: LibraryPackListItem) => void
  onPreview?: (pack: LibraryPackListItem) => void
  importing?: boolean
}

const tierColors: Record<string, string> = {
  free: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  premium: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
}

const sourceLabels: Record<string, string> = {
  official: 'Official',
  partner: 'Partner',
  community: 'Community',
  private: 'Private',
}

export function PackCard({ pack, onImport, onPreview, importing }: PackCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{pack.name}</h3>
              <p className="text-xs text-muted-foreground">v{pack.version}</p>
            </div>
          </div>
          <Badge
            className={tierColors[pack.tier] || ''}
            variant="secondary"
          >
            {pack.tier.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {pack.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {pack.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {pack.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{pack.tags.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{sourceLabels[pack.source] || pack.source}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {pack.installCount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onPreview && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPreview(pack)}
              title="Preview pack contents"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {pack.isImported ? (
            <Button size="sm" variant="ghost" disabled>
              <Check className="h-4 w-4 mr-1" />
              Imported
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onImport(pack)}
              disabled={importing}
            >
              Import
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
