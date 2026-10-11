/**
 * The list of threats in the middle column: triage, rating detail, edit,
 * targets and delete. Shared by the component view and the "By use case"
 * view, so a threat is the same row in both and every edit applies to the
 * one scenario.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ChevronDown, ChevronUp, Crosshair, GripVertical, Loader2, Pencil, Trash2, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { TaxonomyBadges } from '@/components/shared/TaxonomyBadges'
import { SortableList } from '@/components/shared/SortableList'
import { RatingBadge } from '@/features/threat-models/components/rating'
import {
  useDeleteThreat,
  useSetThreatTargets,
  useThreatPersonas,
  useUpdateThreat,
  type TargetRef,
} from '@/features/threat-models/api/threats'
import { isActiveThreat, TRIAGE_STATUS_COLORS, TRIAGE_STATUSES, type TriageStatus } from '@/types/triage'
import type { TaxonomyEntry } from '@/types/domain'
import type { AnalysisThreat, ThreatStatus } from '../../types/threat-analysis'
import { deriveThreatStatus, THREAT_STATUS_CONFIG } from '../../types/threat-analysis'
import { EditTaxonomyMappingsDialog } from './EditTaxonomyMappingsDialog'
import { EditTargetsDialog } from './EditTargetsDialog'
import { ThreatDetailPanel } from './ThreatDetailPanel'
import { NumberBadge } from './NumberBadge'
import { TARGET_TYPE_LABELS, isSameSelection, targetSelection, type AnalysisSelection } from './analysis-selection'

export function ThreatStatusBadge({ status }: { status: ThreatStatus }) {
  const config = THREAT_STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={cn('text-xs', config.bgColor)}>
      {config.label}
    </Badge>
  )
}

export interface ThreatListProps {
  /** Buttons shown under "No threats here yet." (the use case view's add and link). */
  emptyActions?: ReactNode
  threatModelId: string
  /** The threats of the selection, in any order. */
  threats: AnalysisThreat[]
  /** Whether anything is selected; the empty messages show only then. */
  hasSelection: boolean
  /** The tree selection, so "Also on" leaves out the target already shown. */
  selection?: AnalysisSelection | null
  selectedThreatId: string | null
  onSelectThreat: (threatId: string) => void
  /** Makes "Also on" targets clickable. */
  onSelectTarget?: (selection: AnalysisSelection) => void
  onUpdateTriageStatus: (threatUiId: string, triageStatus: TriageStatus, decisionRationale?: string) => void
  /** Called with the new order of the active threats; omit to keep the order fixed. */
  onReorder?: (reorderedThreats: AnalysisThreat[]) => void
  /** Makes a threat's "From abuse cases" names links. */
  onOpenAbuseCase?: (abuseCaseId: number) => void
  /** Adds an "Unlink" button to each row (the threat stays; only the link goes). */
  onUnlink?: (threat: AnalysisThreat) => void
  unlinkLabel?: string
  /** Called after the targets were saved. */
  onTargetsSaved?: (wholeSystem: boolean) => void
}

export function ThreatList({
  threatModelId,
  threats,
  hasSelection,
  selection = null,
  selectedThreatId,
  onSelectThreat,
  onSelectTarget,
  onUpdateTriageStatus,
  onReorder,
  onOpenAbuseCase,
  onUnlink,
  unlinkLabel = 'Unlink',
  emptyActions,
  onTargetsSaved,
}: ThreatListProps) {
  const [showTriagedThreats, setShowTriagedThreats] = useState(false)
  const [pendingTriageFor, setPendingTriageFor] = useState<{ threatId: string; status: TriageStatus } | null>(null)
  const [triageRationale, setTriageRationale] = useState('')
  const [editingTaxonomyFor, setEditingTaxonomyFor] = useState<{
    backendId: number
    name: string
    libraryEntries: TaxonomyEntry[]
  } | null>(null)
  const [deleteThreatConfirmFor, setDeleteThreatConfirmFor] = useState<{ backendId: number; name: string } | null>(null)
  const [editingThreatFor, setEditingThreatFor] = useState<{ backendId: number; name: string; description: string } | null>(
    null
  )
  const [editThreatName, setEditThreatName] = useState('')
  const [editThreatDescription, setEditThreatDescription] = useState('')
  const [editingTargetsFor, setEditingTargetsFor] = useState<AnalysisThreat | null>(null)

  const { data: personas = [] } = useThreatPersonas(threatModelId)
  const updateThreatMutation = useUpdateThreat()
  const setThreatTargetsMutation = useSetThreatTargets()
  const deleteThreatMutation = useDeleteThreat()

  const activeThreats = useMemo(
    () =>
      threats
        .filter((threat) => isActiveThreat(threat.triageStatus))
        .sort((left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0) || left.number - right.number),
    [threats]
  )
  const triagedThreats = threats.filter((threat) => !isActiveThreat(threat.triageStatus))

  const handleSaveEditThreat = () => {
    if (!editingThreatFor || !editThreatName.trim()) return
    updateThreatMutation.mutate(
      {
        threatId: editingThreatFor.backendId,
        data: { threatName: editThreatName.trim(), threatDescription: editThreatDescription.trim() },
      },
      {
        onSuccess: () => {
          toast.success('Threat updated')
          setEditingThreatFor(null)
        },
        onError: () => toast.error('Could not update the threat'),
      }
    )
  }

  const handleConfirmDeleteThreat = () => {
    if (!deleteThreatConfirmFor) return
    deleteThreatMutation.mutate(deleteThreatConfirmFor.backendId, {
      onSuccess: () => {
        toast.success('Threat deleted')
        setDeleteThreatConfirmFor(null)
        setEditingTargetsFor(null)
      },
      onError: () => toast.error('Could not delete the threat'),
    })
  }

  const handleSaveTargets = (targets: TargetRef[], wholeSystem: boolean) => {
    if (!editingTargetsFor) return
    setThreatTargetsMutation.mutate(
      { threatId: editingTargetsFor.backendThreatId, targets, wholeSystem },
      {
        onSuccess: () => {
          toast.success(wholeSystem ? 'Now a whole-system threat' : 'Targets saved')
          setEditingTargetsFor(null)
          onTargetsSaved?.(wholeSystem)
        },
        onError: () => toast.error('Could not save the targets'),
      }
    )
  }

  const confirmTriage = (threatUiId: string, status: TriageStatus) => {
    onUpdateTriageStatus(threatUiId, status, triageRationale.trim())
    setPendingTriageFor(null)
    setTriageRationale('')
  }

  return (
    <>
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {activeThreats.length > 0 && (
                  <div>
                    <p className="mb-1 px-2 py-1 text-xs text-muted-foreground">
                      Triage, rate or delete threats. A change here shows under every target of the threat.
                    </p>
                    <SortableList
                      items={activeThreats}
                      getItemId={(threat) => threat.id}
                      onReorder={(reordered) => {
                        onReorder?.(reordered)
                      }}
                      renderItem={(threat, dragHandleRef) => {
                        const status = deriveThreatStatus(threat.countermeasures)
                        const isSelected = threat.id === selectedThreatId
                        const isShared = threat.targets.length > 1
                        const otherTargets = threat.targets.filter(
                          (target) => !isSameSelection(targetSelection(target.type, target.id), selection)
                        )
                        return (
                          <div
                            className={cn(
                              'group rounded-md p-2 transition-colors',
                              isSelected ? 'border border-slate-300 bg-slate-100' : 'hover:bg-slate-50'
                            )}
                            data-threat-number={threat.displayNumber}
                          >
                            <div className="flex items-center gap-1">
                              {/* No handle where the order is not saved (the use case view). */}
                              {onReorder && (
                                <div
                                  ref={dragHandleRef}
                                  className="shrink-0 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 touch:opacity-100"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelectThreat(threat.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') onSelectThreat(threat.id)
                                }}
                                className="min-w-0 flex-1 cursor-pointer overflow-hidden text-left"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: THREAT_STATUS_CONFIG[status].color }}
                                  />
                                  <NumberBadge number={threat.displayNumber} />
                                  <span className="truncate text-sm font-medium">{threat.threatName || 'Unnamed threat'}</span>
                                  {isShared && (
                                    <Badge variant="outline" className="shrink-0 px-1 py-0 text-[10px] font-normal" title="On several targets">
                                      shared
                                    </Badge>
                                  )}
                                  {threat.wholeSystem && (
                                    <Badge variant="outline" className="shrink-0 px-1 py-0 text-[10px] font-normal">
                                      whole system
                                    </Badge>
                                  )}
                                </div>
                                {!isSelected && (
                                  <div className="ml-4 mt-1 flex items-center gap-1">
                                    <RatingBadge rating={threat.rating} size="sm" />
                                    <TaxonomyBadges entries={threat.taxonomyEntries} maxVisible={1} size="sm" />
                                  </div>
                                )}
                              </div>
                              <ThreatStatusBadge status={status} />
                              <Select
                                value={threat.triageStatus}
                                onValueChange={(value) => {
                                  const nextStatus = value as TriageStatus
                                  if (nextStatus === 'accept' || nextStatus === 'delegate' || nextStatus === 'eliminate') {
                                    setPendingTriageFor({ threatId: threat.id, status: nextStatus })
                                    setTriageRationale('')
                                  } else {
                                    onUpdateTriageStatus(threat.id, nextStatus)
                                  }
                                }}
                              >
                                <SelectTrigger
                                  className="h-6 w-[100px] shrink-0 text-xs"
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label="Triage"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRIAGE_STATUSES.map((entry) => (
                                    <SelectItem key={entry.value} value={entry.value} className="text-xs">
                                      {entry.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {onUnlink && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 touch:opacity-100"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    onUnlink(threat)
                                  }}
                                  title={unlinkLabel}
                                  aria-label={`${unlinkLabel}: ${threat.displayNumber}`}
                                >
                                  <Unlink className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 touch:opacity-100"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setEditingTargetsFor(threat)
                                }}
                                title="Edit targets"
                                aria-label={`Edit targets of ${threat.displayNumber}`}
                              >
                                <Crosshair className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 touch:opacity-100"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setEditingThreatFor({
                                    backendId: threat.backendThreatId,
                                    name: threat.threatName || '',
                                    description: threat.threatDescription || '',
                                  })
                                  setEditThreatName(threat.threatName || '')
                                  setEditThreatDescription(threat.threatDescription || '')
                                }}
                                title="Edit threat"
                                aria-label={`Edit ${threat.displayNumber}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 touch:opacity-100"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setDeleteThreatConfirmFor({
                                    backendId: threat.backendThreatId,
                                    name: threat.threatName || 'this threat',
                                  })
                                }}
                                title="Delete threat"
                                aria-label={`Delete ${threat.displayNumber}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {(isShared || threat.libraryMismatch) && (
                              <div className="ml-4 mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                                {isShared && otherTargets.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-x-1">
                                    <span>Also on:</span>
                                    {otherTargets.map((target, index) => (
                                      <span key={`${target.type}-${target.id}`}>
                                        {onSelectTarget ? (
                                          <button
                                            type="button"
                                            className="text-blue-600 hover:underline"
                                            onClick={() => onSelectTarget(targetSelection(target.type, target.id))}
                                          >
                                            {target.name || 'Unnamed'} ({TARGET_TYPE_LABELS[target.type]})
                                          </button>
                                        ) : (
                                          <span>
                                            {target.name || 'Unnamed'} ({TARGET_TYPE_LABELS[target.type]})
                                          </span>
                                        )}
                                        {index < otherTargets.length - 1 ? ',' : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {threat.libraryMismatch && (
                                  <div className="flex items-center gap-1 text-amber-700">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    The library no longer lists this threat here. It was kept because it has been edited.
                                  </div>
                                )}
                              </div>
                            )}

                            {isSelected && (
                              <div className="ml-4 mt-1 flex items-center gap-1">
                                <TaxonomyBadges entries={threat.taxonomyEntries} size="sm" />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setEditingTaxonomyFor({
                                      backendId: threat.backendThreatId,
                                      name: threat.threatName || '',
                                      libraryEntries: (threat.taxonomyEntries || []).filter(
                                        (entry) => entry.source === 'library' || !entry.source
                                      ),
                                    })
                                  }}
                                  title="Edit categories"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            )}

                            {pendingTriageFor?.threatId === threat.id && (
                              <div
                                className="ml-4 mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-2"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div className="text-xs font-medium text-amber-800">
                                  Rationale for {TRIAGE_STATUSES.find((entry) => entry.value === pendingTriageFor.status)?.label}:
                                </div>
                                <input
                                  type="text"
                                  value={triageRationale}
                                  onChange={(event) => setTriageRationale(event.target.value)}
                                  placeholder="Why is this the right decision?"
                                  className="h-8 w-full rounded border bg-background px-2 text-sm"
                                  autoFocus
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' && triageRationale.trim()) confirmTriage(threat.id, pendingTriageFor.status)
                                  }}
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={!triageRationale.trim()}
                                    onClick={() => confirmTriage(threat.id, pendingTriageFor.status)}
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setPendingTriageFor(null)
                                      setTriageRationale('')
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {isSelected && (
                              <div className="ml-4 mt-1 rounded-md border border-slate-200 bg-slate-50 p-2">
                                <ThreatDetailPanel
                                  key={threat.id}
                                  threatModelId={threatModelId}
                                  threat={threat}
                                  personas={personas}
                                  onOpenAbuseCase={onOpenAbuseCase}
                                />
                              </div>
                            )}
                          </div>
                        )
                      }}
                    />
                  </div>
                )}

                {hasSelection && activeThreats.length === 0 && triagedThreats.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">No threats here yet.</p>
                    {emptyActions && <div className="mt-3 flex justify-center">{emptyActions}</div>}
                  </div>
                )}

                {hasSelection && activeThreats.length === 0 && triagedThreats.length > 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">All threats have been triaged.</p>
                    <p className="mt-1 text-xs">Reopen from the section below if needed.</p>
                  </div>
                )}

                {hasSelection && triagedThreats.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <button
                      className="flex w-full items-center justify-between px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setShowTriagedThreats((open) => !open)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Triaged threats</span>
                        <Badge variant="outline" className="bg-slate-100 text-xs">
                          {triagedThreats.length}
                        </Badge>
                      </div>
                      {showTriagedThreats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showTriagedThreats && (
                      <div className="mt-2 space-y-1">
                        {triagedThreats.map((threat) => {
                          const statusLabel =
                            TRIAGE_STATUSES.find((entry) => entry.value === threat.triageStatus)?.label || threat.triageStatus
                          return (
                            <div key={threat.id} className="group flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-slate-50">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <NumberBadge number={threat.displayNumber} />
                                  <span className="truncate text-sm text-muted-foreground line-through">{threat.threatName}</span>
                                  <Badge variant="outline" className={cn('text-[10px]', TRIAGE_STATUS_COLORS[threat.triageStatus])}>
                                    {statusLabel}
                                  </Badge>
                                </div>
                                {threat.decisionRationale && (
                                  <p className="mt-0.5 truncate text-xs italic text-muted-foreground">{threat.decisionRationale}</p>
                                )}
                                <TaxonomyBadges entries={threat.taxonomyEntries} maxVisible={1} size="sm" />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => onUpdateTriageStatus(threat.id, 'open')}
                              >
                                Reopen
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

      {editingTaxonomyFor && (
        <EditTaxonomyMappingsDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingTaxonomyFor(null)
          }}
          threatModelId={threatModelId}
          threatId={editingTaxonomyFor.backendId}
          threatName={editingTaxonomyFor.name}
          libraryTaxonomyEntries={editingTaxonomyFor.libraryEntries}
        />
      )}

      {editingTargetsFor && (
        <EditTargetsDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingTargetsFor(null)
          }}
          threatModelId={threatModelId}
          title={`${editingTargetsFor.displayNumber} Edit targets`}
          initialTargets={editingTargetsFor.targets.map((target) => ({ type: target.type, id: target.id }))}
          initialWholeSystem={editingTargetsFor.wholeSystem}
          mode="threat"
          isSaving={setThreatTargetsMutation.isPending}
          onSave={handleSaveTargets}
          onDelete={() =>
            setDeleteThreatConfirmFor({
              backendId: editingTargetsFor.backendThreatId,
              name: editingTargetsFor.threatName || 'this threat',
            })
          }
        />
      )}

      <AlertDialog
        open={!!deleteThreatConfirmFor}
        onOpenChange={(open) => {
          if (!open) setDeleteThreatConfirmFor(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete threat?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes "{deleteThreatConfirmFor?.name}" from every target it sits on. Untouched generated controls linked
              only to it go too. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteThreatMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleConfirmDeleteThreat()
              }}
              disabled={deleteThreatMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteThreatMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!editingThreatFor}
        onOpenChange={(open) => {
          if (!open) setEditingThreatFor(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit threat</DialogTitle>
            <DialogDescription>Update the threat name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-threat-name">Threat name *</Label>
              <Input
                id="edit-threat-name"
                value={editThreatName}
                onChange={(event) => setEditThreatName(event.target.value)}
                placeholder="Threat name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-threat-description">Description</Label>
              <Textarea
                id="edit-threat-description"
                value={editThreatDescription}
                onChange={(event) => setEditThreatDescription(event.target.value)}
                placeholder="Describe the threat"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingThreatFor(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditThreat} disabled={!editThreatName.trim() || updateThreatMutation.isPending}>
              {updateThreatMutation.isPending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
