import {
  Package,
  Loader2,
  Eye,
  Check,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { UnifiedPack } from './unified-pack'
import { packTypeColors, tierColors } from '../constants'

export function CatalogPackCard({
  pack,
  onImport,
  onPreview,
  isImporting,
  isSecurityTeam,
}: {
  pack: UnifiedPack
  onImport: (pack: UnifiedPack) => void
  onPreview: (pack: UnifiedPack) => void
  isImporting: boolean
  isSecurityTeam: boolean
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">{pack.name}</h3>
            <p className="text-sm text-muted-foreground">v{pack.version}</p>
          </div>
        </div>
        <Badge className={tierColors[pack.tier] || 'bg-gray-100'}>
          {pack.tier.toUpperCase()}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">
        {pack.description || 'No description available'}
      </p>

      <div className="flex flex-wrap gap-1">
        <Badge
          variant="secondary"
          className={packTypeColors[pack.packType] || 'bg-gray-100'}
        >
          {pack.packType}
        </Badge>
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

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{pack.source === 'official' ? 'Official' : 'Community'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPreview(pack)}
            title="Preview pack contents"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {pack.isImported ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Check className="mr-1 h-3 w-3" />
              Imported
            </Badge>
          ) : isSecurityTeam ? (
            <Button size="sm" onClick={() => onImport(pack)} disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Download className="mr-2 h-3 w-3" />
              )}
              Import
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
