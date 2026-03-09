import { useState, useMemo } from 'react'
import { Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useZoneProtections,
  useApplyZoneProtections,
  type ZoneProtectionSuggestion,
} from '@/api/threats'

interface ReviewZoneProtectionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
  onSuccess: () => void
}

export function ReviewZoneProtectionsDialog({
  open,
  onOpenChange,
  threatModelId,
  onSuccess,
}: ReviewZoneProtectionsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const { data, isLoading } = useZoneProtections(threatModelId, open)
  const applyMutation = useApplyZoneProtections()

  const suggestions = data?.suggestions ?? []

  // Group suggestions by target component
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, ZoneProtectionSuggestion[]> = {}
    for (const suggestion of suggestions) {
      const key = `${suggestion.targetComponentName} (${suggestion.targetZoneName})`
      if (!groups[key]) groups[key] = []
      groups[key].push(suggestion)
    }
    return groups
  }, [suggestions])

  const allSelected = suggestions.length > 0 && selectedIds.size === suggestions.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < suggestions.length

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(suggestions.map((s) => s.targetCountermeasureId)))
    }
  }

  function toggleSuggestion(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleApply() {
    const items = suggestions
      .filter((s) => selectedIds.has(s.targetCountermeasureId))
      .map((s) => ({
        countermeasureId: s.targetCountermeasureId,
        sourceComponentName: s.sourceComponentName,
        sourceZoneName: s.sourceZoneName,
      }))

    applyMutation.mutate(
      { threatModelId, items },
      {
        onSuccess: () => {
          setSelectedIds(new Set())
          onOpenChange(false)
          onSuccess()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Zone Protections
          </DialogTitle>
          <DialogDescription>
            Components in inner zones can inherit platform countermeasures from
            protective components in outer zones. Select the protections to apply.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No zone-based protections available. This can happen when there are
            no trust boundaries, no platform countermeasures in outer zones, or
            all inheritable countermeasures are already resolved.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b pb-2">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ScrollArea className="max-h-[360px]">
              <div className="space-y-4 pr-4">
                {Object.entries(groupedSuggestions).map(([groupLabel, groupSuggestions]) => (
                  <div key={groupLabel}>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      {groupLabel}
                    </div>
                    <div className="space-y-2">
                      {groupSuggestions.map((suggestion) => (
                        <label
                          key={suggestion.targetCountermeasureId}
                          className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedIds.has(suggestion.targetCountermeasureId)}
                            onCheckedChange={() =>
                              toggleSuggestion(suggestion.targetCountermeasureId)
                            }
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              {suggestion.countermeasureName}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              From{' '}
                              <span className="font-medium text-foreground">
                                {suggestion.sourceComponentName}
                              </span>{' '}
                              ({suggestion.sourceZoneName})
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {suggestions.length > 0 && (
            <Button
              onClick={handleApply}
              disabled={selectedIds.size === 0 || applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Apply Selected ({selectedIds.size})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
