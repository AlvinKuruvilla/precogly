import { Package, ShieldX, FileText, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SystemContext } from '@/features/dfd-editor/types/threat-analysis'
import { ASSET_CLASSIFICATION_CONFIG } from '@/features/dfd-editor/types/threat-analysis'

interface SystemContextCardProps {
  systemContext: SystemContext
  onEdit: () => void
}

export function SystemContextCard({ systemContext, onEdit }: SystemContextCardProps) {
  const assets = systemContext.assets || []
  const outOfScopeItems = systemContext.outOfScopeItems || []
  const description = systemContext.description || ''

  const hasContent = assets.length > 0 || outOfScopeItems.length > 0 || description.length > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">System Context</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasContent ? (
          <p className="text-sm text-muted-foreground">
            No system context defined yet. Click Edit to add assets, exclusions, or a description.
          </p>
        ) : (
          <>
            {/* Assets Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 text-muted-foreground" />
                Assets
                {assets.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {assets.length}
                  </Badge>
                )}
              </div>
              {assets.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {assets.slice(0, 5).map((asset) => (
                    <Badge
                      key={asset.id}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {asset.name}
                      <span className="ml-1 text-muted-foreground">
                        ({ASSET_CLASSIFICATION_CONFIG[asset.classification]?.label.split(' ')[0] || asset.classification})
                      </span>
                    </Badge>
                  ))}
                  {assets.length > 5 && (
                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                      +{assets.length - 5} more
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No assets defined</p>
              )}
            </div>

            {/* Out of Scope Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldX className="h-4 w-4 text-muted-foreground" />
                Out of Scope
                {outOfScopeItems.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {outOfScopeItems.length}
                  </Badge>
                )}
              </div>
              {outOfScopeItems.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {outOfScopeItems.slice(0, 5).map((item) => (
                    <Badge
                      key={item.id}
                      variant="outline"
                      className="text-xs font-normal bg-gray-50"
                    >
                      {item.name}
                    </Badge>
                  ))}
                  {outOfScopeItems.length > 5 && (
                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                      +{outOfScopeItems.length - 5} more
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No exclusions defined</p>
              )}
            </div>

            {/* Description Section */}
            {description && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Description
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {description}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
