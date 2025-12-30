/**
 * Dialog for previewing pack contents (components, threats, countermeasures).
 */

import { Box, Loader2, Package, Shield, ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  usePackPreview,
  useSourcePackPreview,
  type PackPreviewResponse,
} from '@/api/packs'

interface PreviewPackDialogProps {
  /** Pack ID for database packs */
  packId?: number | null
  /** Pack slug for source packs */
  packSlug?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreviewPackDialog({
  packId,
  packSlug,
  open,
  onOpenChange,
}: PreviewPackDialogProps) {
  // Use the appropriate hook based on what's provided
  const dbPreview = usePackPreview(packSlug ? null : packId ?? null)
  const sourcePreview = useSourcePackPreview(packId ? null : packSlug ?? null)

  const isLoading = packSlug ? sourcePreview.isLoading : dbPreview.isLoading
  const preview = packSlug ? sourcePreview.data : dbPreview.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : preview ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {preview.pack.name}
                <Badge variant="outline" className="ml-2">
                  v{preview.pack.version}
                </Badge>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <PackTypeBadge type={preview.pack.packType} />
                <TierBadge tier={preview.pack.tier} />
                {preview.pack.author && (
                  <span className="text-xs">by {preview.pack.author}</span>
                )}
              </DialogDescription>
            </DialogHeader>

            {preview.pack.description && (
              <p className="text-sm text-muted-foreground">
                {preview.pack.description}
              </p>
            )}

            <PreviewTabs preview={preview} />
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Failed to load pack preview.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PreviewTabs({ preview }: { preview: PackPreviewResponse }) {
  const componentCount = preview.components.length
  const threatCount = preview.threats.length
  const countermeasureCount = preview.countermeasures.length

  return (
    <Tabs defaultValue="components" className="flex-1 flex flex-col min-h-0">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="components">
          <Box className="h-4 w-4 mr-1" />
          Components ({componentCount})
        </TabsTrigger>
        <TabsTrigger value="threats">
          <ShieldAlert className="h-4 w-4 mr-1" />
          Threats ({threatCount})
        </TabsTrigger>
        <TabsTrigger value="countermeasures">
          <Shield className="h-4 w-4 mr-1" />
          Countermeasures ({countermeasureCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="components" className="flex-1 min-h-0">
        <ScrollArea className="h-[350px]">
          {componentCount === 0 ? (
            <EmptyState text="No components in this pack" />
          ) : (
            <div className="space-y-2 pr-4">
              {preview.components.map((comp, idx) => (
                <div
                  key={comp.slug || idx}
                  className="border rounded-lg p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{comp.name}</span>
                    <div className="flex gap-1">
                      {comp.category && (
                        <Badge variant="secondary" className="text-xs">
                          {comp.category}
                        </Badge>
                      )}
                      {comp.componentType && (
                        <Badge variant="outline" className="text-xs">
                          {comp.componentType}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {comp.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {comp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="threats" className="flex-1 min-h-0">
        <ScrollArea className="h-[350px]">
          {threatCount === 0 ? (
            <EmptyState text="No threats in this pack" />
          ) : (
            <div className="space-y-2 pr-4">
              {preview.threats.map((threat, idx) => (
                <div
                  key={threat.slug || idx}
                  className="border rounded-lg p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{threat.name}</span>
                    <div className="flex gap-1">
                      {threat.strideCategory && (
                        <StrideBadge category={threat.strideCategory} />
                      )}
                      {threat.severity && (
                        <SeverityBadge severity={threat.severity} />
                      )}
                    </div>
                  </div>
                  {threat.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {threat.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="countermeasures" className="flex-1 min-h-0">
        <ScrollArea className="h-[350px]">
          {countermeasureCount === 0 ? (
            <EmptyState text="No countermeasures in this pack" />
          ) : (
            <div className="space-y-2 pr-4">
              {preview.countermeasures.map((cm, idx) => (
                <div
                  key={cm.slug || idx}
                  className="border rounded-lg p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{cm.name}</span>
                    <div className="flex gap-1">
                      {cm.controlType && (
                        <Badge variant="secondary" className="text-xs">
                          {cm.controlType}
                        </Badge>
                      )}
                      {cm.cost && <CostBadge cost={cm.cost} />}
                    </div>
                  </div>
                  {cm.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {cm.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      {text}
    </div>
  )
}

function PackTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    technology: 'bg-blue-100 text-blue-800',
    threat: 'bg-red-100 text-red-800',
    countermeasure: 'bg-green-100 text-green-800',
    compliance: 'bg-purple-100 text-purple-800',
    template: 'bg-yellow-100 text-yellow-800',
    full: 'bg-gray-100 text-gray-800',
  }
  return (
    <Badge variant="secondary" className={colors[type] || ''}>
      {type}
    </Badge>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    free: 'bg-green-100 text-green-800',
    premium: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-amber-100 text-amber-800',
  }
  return (
    <Badge variant="secondary" className={colors[tier] || ''}>
      {tier}
    </Badge>
  )
}

function StrideBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    spoofing: 'bg-orange-100 text-orange-800',
    tampering: 'bg-red-100 text-red-800',
    repudiation: 'bg-yellow-100 text-yellow-800',
    information_disclosure: 'bg-blue-100 text-blue-800',
    denial_of_service: 'bg-purple-100 text-purple-800',
    elevation_of_privilege: 'bg-pink-100 text-pink-800',
  }
  const label = category.replace(/_/g, ' ')
  return (
    <Badge variant="outline" className={colors[category] || ''}>
      {label}
    </Badge>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  }
  return (
    <Badge variant="secondary" className={colors[severity] || ''}>
      {severity}
    </Badge>
  )
}

function CostBadge({ cost }: { cost: string }) {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  }
  return (
    <Badge variant="outline" className={colors[cost] || ''}>
      {cost} cost
    </Badge>
  )
}
