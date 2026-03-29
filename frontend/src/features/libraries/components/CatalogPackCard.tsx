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

const packTypeColors: Record<string, string> = {
  technology: 'bg-blue-100 text-blue-800',
  threat: 'bg-red-100 text-red-800',
  countermeasure: 'bg-green-100 text-green-800',
  compliance: 'bg-purple-100 text-purple-800',
  template: 'bg-yellow-100 text-yellow-800',
  full: 'bg-gray-100 text-gray-800',
  taxonomy: 'bg-teal-100 text-teal-800',
}

const tierColors: Record<string, string> = {
  free: 'bg-green-100 text-green-800',
  premium: 'bg-amber-100 text-amber-800',
  enterprise: 'bg-indigo-100 text-indigo-800',
}

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
