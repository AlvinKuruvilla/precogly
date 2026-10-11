/**
 * The "By use case" threat analysis view: use cases, their abuse cases, and
 * the threats and countermeasures that follow. Same three columns as the
 * component view; only the left tree differs. The threat list and the
 * countermeasure column are the ones the component view uses, and threats
 * come from the same analysis payload, so a threat is one row in both views.
 */

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Link2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import {
  useAbuseCases,
  useDeleteAbuseCase,
  useUpdateAbuseCase,
  useUseCases,
} from '@/features/threat-models/api/threat-models'
import { AbuseCaseDialog } from '@/features/threat-models/components/use-cases/AbuseCaseDialog'
import { UseCaseDialog } from '@/features/threat-models/components/use-cases/UseCaseDialog'
import { USE_CASE_GAP_LABELS, errorMessages } from '@/features/threat-models/components/use-cases/use-case-utils'
import type { AbuseCase, UnlinkedRealizes } from '@/features/threat-models/types/core'
import type { TriageStatus } from '@/types/triage'
import { isActiveThreat } from '@/types/triage'
import type { AnalysisCountermeasure, AnalysisThreat, CountermeasureStatus } from '../../types/threat-analysis'
import { AddThreatDialog } from './AddThreatDialog'
import { LinkThreatDialog } from './LinkThreatDialog'
import { CountermeasureColumn } from './CountermeasureColumn'
import { ThreatList } from './ThreatList'
import type { Assignee } from './CountermeasureCard'
import {
  abuseCaseHasNoThreat,
  buildAddThreatPreset,
  buildUseCaseTree,
  threatIdsWithout,
  threatsForUseCaseSelection,
  type UseCaseViewSelection,
} from './use-case-view-utils'

export interface UseCaseViewProps {
  threatModelId: string
  /** The scenarios shown (the page may filter them by diagram). */
  threats: AnalysisThreat[]
  selection: UseCaseViewSelection | null
  onSelectionChange: (selection: UseCaseViewSelection | null) => void
  selectedThreatId: string | null
  selectedThreat: AnalysisThreat | null
  onSelectThreat: (threatId: string) => void
  /** Switch to another abuse case (from a threat's "From abuse cases" links). */
  onOpenAbuseCase?: (abuseCaseId: number) => void
  onCountermeasureStatusChange: (
    threatUiId: string,
    countermeasureId: string,
    status: CountermeasureStatus,
    notes?: string
  ) => void
  onAssignOwner: (threatUiId: string, countermeasureId: string, assignee: Assignee, newStatus?: CountermeasureStatus) => void
  onUpdateTriageStatus: (threatUiId: string, triageStatus: TriageStatus, decisionRationale?: string) => void
  onAddCustomCountermeasure: () => void
  onCountermeasurePriorityChange: (threatUiId: string, countermeasureId: string, priority: AnalysisCountermeasure['priority']) => void
  onCountermeasureDueDateChange: (threatUiId: string, countermeasureId: string, dueDate: string | null) => void
  onCountermeasureExternalTicketChange: (threatUiId: string, countermeasureId: string, externalTicketUrl: string) => void
  onReorderCountermeasures?: (threatUiId: string, reorderedCountermeasures: AnalysisCountermeasure[]) => void
  isSecurityTeam?: boolean
}

const GAP_BADGE_CLASS = 'shrink-0 border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-normal text-amber-800'

export function UseCaseView({
  threatModelId,
  threats,
  selection,
  onSelectionChange,
  selectedThreatId,
  selectedThreat,
  onSelectThreat,
  onOpenAbuseCase,
  onCountermeasureStatusChange,
  onAssignOwner,
  onUpdateTriageStatus,
  onAddCustomCountermeasure,
  onCountermeasurePriorityChange,
  onCountermeasureDueDateChange,
  onCountermeasureExternalTicketChange,
  onReorderCountermeasures,
  isSecurityTeam,
}: UseCaseViewProps) {
  const { data: useCases = [] } = useUseCases(threatModelId)
  const { data: abuseCases = [] } = useAbuseCases(threatModelId)
  const updateAbuseCase = useUpdateAbuseCase(threatModelId)
  const deleteAbuseCase = useDeleteAbuseCase(threatModelId)

  const [collapsedUseCaseIds, setCollapsedUseCaseIds] = useState<Set<number>>(new Set())
  // The abuse case dialog: create under a use case, edit one, or closed.
  const [abuseCaseDialog, setAbuseCaseDialog] = useState<
    { mode: 'create'; useCaseId?: number } | { mode: 'edit'; abuseCase: AbuseCase } | null
  >(null)
  const [deleteAbuseCaseFor, setDeleteAbuseCaseFor] = useState<AbuseCase | null>(null)
  const [useCaseDialogOpen, setUseCaseDialogOpen] = useState(false)
  const [addThreatFor, setAddThreatFor] = useState<AbuseCase | null>(null)
  const [linkThreatFor, setLinkThreatFor] = useState<AbuseCase | null>(null)

  const tree = useMemo(() => buildUseCaseTree(useCases, abuseCases), [useCases, abuseCases])

  const threatsOfSelection = useMemo(
    () => threatsForUseCaseSelection(selection, abuseCases, threats),
    [selection, abuseCases, threats]
  )
  const activeCount = threatsOfSelection.filter((threat) => isActiveThreat(threat.triageStatus)).length

  const selectedAbuseCase =
    selection?.kind === 'abuseCase' ? abuseCases.find((abuseCase) => abuseCase.id === selection.abuseCaseId) ?? null : null
  const selectedUseCaseForLabel =
    selection && selection.kind !== 'abuseCase' ? useCases.find((useCase) => useCase.id === selection.useCaseId) : null

  let selectionLabel = 'Select a use case or an abuse case'
  if (selectedAbuseCase) selectionLabel = `${selectedAbuseCase.name} (abuse case)`
  else if (selection?.kind === 'useCase' && selectedUseCaseForLabel) selectionLabel = `${selectedUseCaseForLabel.name} (use case)`

  const addThreatPreset = useMemo(
    () => (addThreatFor ? buildAddThreatPreset(addThreatFor, useCases) : null),
    [addThreatFor, useCases]
  )

  const toggleCollapsed = useCallback((useCaseId: number) => {
    setCollapsedUseCaseIds((previous) => {
      const next = new Set(previous)
      if (next.has(useCaseId)) next.delete(useCaseId)
      else next.add(useCaseId)
      return next
    })
  }, [])

  const selectThreatByBackendId = useCallback(
    (backendThreatId: number) => {
      const threat = threats.find((candidate) => candidate.backendThreatId === backendThreatId)
      if (threat) onSelectThreat(threat.id)
    },
    [threats, onSelectThreat]
  )

  const handleUnlinkThreat = (threat: AnalysisThreat) => {
    if (!selectedAbuseCase) return
    updateAbuseCase.mutate(
      { abuseCaseId: selectedAbuseCase.id, data: { threatIds: threatIdsWithout(selectedAbuseCase, threat.backendThreatId) } },
      {
        onSuccess: () => toast.success('Threat unlinked from the abuse case'),
        onError: (error) => toast.error(errorMessages(error, 'Could not unlink the threat')[0]),
      }
    )
  }

  const handleConfirmDeleteAbuseCase = () => {
    if (!deleteAbuseCaseFor) return
    const deleted = deleteAbuseCaseFor
    deleteAbuseCase.mutate(deleted.id, {
      onSuccess: () => {
        toast.success('Abuse case deleted')
        setDeleteAbuseCaseFor(null)
        if (selection?.kind === 'abuseCase' && selection.abuseCaseId === deleted.id) onSelectionChange(null)
      },
      onError: () => toast.error('Could not delete the abuse case'),
    })
  }

  const renderAbuseCaseRow = (abuseCase: AbuseCase, indent: number, keyPrefix: string) => {
    const isSelected = selection?.kind === 'abuseCase' && selection.abuseCaseId === abuseCase.id
    const select = () => onSelectionChange({ kind: 'abuseCase', abuseCaseId: abuseCase.id })
    const actionClass = cn(
      'h-6 shrink-0 text-muted-foreground hover:text-foreground',
      isSelected ? '' : 'opacity-0 transition-opacity group-hover:opacity-100 touch:opacity-100'
    )
    return (
      <div
        key={`${keyPrefix}-${abuseCase.id}`}
        role="button"
        tabIndex={0}
        data-tree-key={`${keyPrefix}-abuse-case-${abuseCase.id}`}
        onClick={select}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            select()
          }
        }}
        className={cn(
          'group w-full cursor-pointer rounded-md p-1.5 text-left transition-colors',
          isSelected ? 'border border-slate-300 bg-slate-100' : 'hover:bg-slate-50'
        )}
        style={{ paddingLeft: `${indent}px` }}
      >
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-sm">{abuseCase.name}</span>
          {abuseCaseHasNoThreat(abuseCase) && (
            <Badge variant="outline" className={GAP_BADGE_CLASS}>
              No threat
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(actionClass, 'w-6')}
            onClick={(event) => {
              event.stopPropagation()
              setAbuseCaseDialog({ mode: 'edit', abuseCase })
            }}
            title="Edit abuse case"
            aria-label={`Edit ${abuseCase.name}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(actionClass, 'w-6 hover:text-destructive')}
            onClick={(event) => {
              event.stopPropagation()
              setDeleteAbuseCaseFor(abuseCase)
            }}
            title="Delete abuse case"
            aria-label={`Delete ${abuseCase.name}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  // Threat actions sit in the center column, as in the component view; the
  // tree only selects and edits the structure.
  const threatActions = (abuseCase: AbuseCase) => (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAddThreatFor(abuseCase)}>
        <Plus className="h-3 w-3" />
        Add
      </Button>
      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setLinkThreatFor(abuseCase)}>
        <Link2 className="h-3 w-3" />
        Link existing
      </Button>
    </div>
  )

  const renderUnlinkedRealizes = (entry: UnlinkedRealizes, abuseCase: AbuseCase) => (
    <div
      key={entry.libraryThreatId ?? entry.ref ?? entry.name}
      className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"
      data-testid="unlinked-realizes"
    >
      <span>Realizes library threat {entry.name}, not linked to a threat in this model.</span>
      <button type="button" className="text-blue-600 hover:underline" onClick={() => setLinkThreatFor(abuseCase)}>
        Link a threat
      </button>
    </div>
  )

  return (
    <div className="h-full min-h-0 flex-1 overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        {/* Column 1: use cases and their abuse cases */}
        <ResizablePanel defaultSize="22%" minSize="12%" maxSize="35%">
          <div className="flex h-full flex-col">
            <div className="border-b px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">By use case</div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setUseCaseDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Use case
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setAbuseCaseDialog({ mode: 'create' })}
                  >
                    <Plus className="h-3 w-3" />
                    Abuse case
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {useCases.length} use cases, {abuseCases.length} abuse cases
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-0.5 p-2" data-testid="use-case-tree">
                {useCases.length === 0 && abuseCases.length === 0 && (
                  <div className="space-y-3 px-2 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No use cases yet. Start with what the system is for, such as Place order, then ask how
                      each one can be abused.
                    </p>
                    <Button size="sm" className="gap-1" onClick={() => setUseCaseDialogOpen(true)}>
                      <Plus className="h-3 w-3" />
                      Add use case
                    </Button>
                  </div>
                )}
                {tree.useCaseNodes.map((node) => {
                  const { useCase } = node
                  const isCollapsed = collapsedUseCaseIds.has(useCase.id)
                  const isSelected = selection?.kind === 'useCase' && selection.useCaseId === useCase.id
                  const select = () => onSelectionChange({ kind: 'useCase', useCaseId: useCase.id })
                  return (
                    <div key={useCase.id} data-tree-key={`use-case-${useCase.id}`}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={select}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            select()
                          }
                        }}
                        className={cn(
                          'group w-full cursor-pointer rounded-md p-1.5 text-left transition-colors',
                          isSelected ? 'border border-slate-300 bg-slate-100' : 'hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleCollapsed(useCase.id)
                            }}
                            aria-label={isCollapsed ? `Expand ${useCase.name}` : `Collapse ${useCase.name}`}
                          >
                            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{useCase.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 touch:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation()
                              setAbuseCaseDialog({ mode: 'create', useCaseId: useCase.id })
                            }}
                            title="Add abuse case"
                            aria-label={`Add abuse case to ${useCase.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {node.gaps.length > 0 && (
                          <div className="ml-5 mt-0.5 flex flex-wrap gap-1">
                            {node.gaps.map((gap) => (
                              <Badge key={gap} variant="outline" className={GAP_BADGE_CLASS}>
                                {USE_CASE_GAP_LABELS[gap]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {!isCollapsed && (
                        <div className="space-y-0.5">
                          {node.abuseCases.map((abuseCase) => renderAbuseCaseRow(abuseCase, 26, `uc-${useCase.id}`))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {tree.unlinkedAbuseCases.length > 0 && (
                  <div className="mt-2" data-tree-key="not-linked-to-use-case">
                    <div className="px-1.5 py-1 text-sm font-medium text-muted-foreground">Not linked to a use case</div>
                    <div className="space-y-0.5">
                      {tree.unlinkedAbuseCases.map((abuseCase) => renderAbuseCaseRow(abuseCase, 14, 'none'))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Column 2: the threats of the selection */}
        <ResizablePanel defaultSize="36%" minSize="20%" maxSize="55%">
          <div className="flex h-full flex-col">
            <div className="border-b px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">Threats</div>
                <div className="flex items-center gap-2">
                  {activeCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {activeCount} active
                    </Badge>
                  )}
                  {selectedAbuseCase && threatActions(selectedAbuseCase)}
                </div>
              </div>
              <div className="text-xs text-muted-foreground" data-testid="selection-label">
                {selectionLabel}
              </div>
              {selection?.kind === 'useCase' && (
                <div className="text-xs text-muted-foreground">Select an abuse case to add threats to it.</div>
              )}
            </div>

            {selectedAbuseCase && selectedAbuseCase.unlinkedRealizes.length > 0 && (
              <div className="space-y-1 border-b px-3 py-2">
                {selectedAbuseCase.unlinkedRealizes.map((entry) => renderUnlinkedRealizes(entry, selectedAbuseCase))}
              </div>
            )}

            <ThreatList
              threatModelId={threatModelId}
              threats={threatsOfSelection}
              hasSelection={selection !== null}
              selectedThreatId={selectedThreatId}
              onSelectThreat={onSelectThreat}
              onUpdateTriageStatus={onUpdateTriageStatus}
              onOpenAbuseCase={onOpenAbuseCase}
              onUnlink={selectedAbuseCase ? handleUnlinkThreat : undefined}
              unlinkLabel="Unlink from abuse case"
              emptyActions={
                selectedAbuseCase ? (
                  <div className="space-y-3">
                    <p className="mx-auto max-w-sm text-xs">
                      Link the threats this abuse case leads to. You rate those and add countermeasures.
                    </p>
                    <div className="flex justify-center">{threatActions(selectedAbuseCase)}</div>
                  </div>
                ) : undefined
              }
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Column 3: the countermeasures of the selected threat */}
        <CountermeasureColumn
          threatModelId={threatModelId}
          threats={threats}
          selectedThreat={selectedThreat}
          onSelectThreatByBackendId={selectThreatByBackendId}
          onCountermeasureStatusChange={onCountermeasureStatusChange}
          onAssignOwner={onAssignOwner}
          onAddCustomCountermeasure={onAddCustomCountermeasure}
          onCountermeasurePriorityChange={onCountermeasurePriorityChange}
          onCountermeasureDueDateChange={onCountermeasureDueDateChange}
          onCountermeasureExternalTicketChange={onCountermeasureExternalTicketChange}
          onReorderCountermeasures={onReorderCountermeasures}
          isSecurityTeam={isSecurityTeam}
        />
      </ResizablePanelGroup>

      <UseCaseDialog
        threatModelId={threatModelId}
        open={useCaseDialogOpen}
        onOpenChange={setUseCaseDialogOpen}
        onSaved={(saved) => onSelectionChange({ kind: 'useCase', useCaseId: saved.id })}
      />

      <AbuseCaseDialog
        threatModelId={threatModelId}
        open={abuseCaseDialog !== null}
        onOpenChange={(open) => {
          if (!open) setAbuseCaseDialog(null)
        }}
        abuseCase={abuseCaseDialog?.mode === 'edit' ? abuseCaseDialog.abuseCase : undefined}
        defaultUseCaseId={abuseCaseDialog?.mode === 'create' ? abuseCaseDialog.useCaseId : undefined}
        onSaved={(saved) => {
          if (abuseCaseDialog?.mode === 'create') onSelectionChange({ kind: 'abuseCase', abuseCaseId: saved.id })
        }}
      />

      {addThreatFor && addThreatPreset && (
        <AddThreatDialog
          open
          onOpenChange={(open) => {
            if (!open) setAddThreatFor(null)
          }}
          threatModelId={threatModelId}
          initialTargets={addThreatPreset.initialTargets}
          initialWholeSystem={false}
          suggestedTargets={addThreatPreset.suggestedTargets}
          initialActor={addThreatPreset.initialActor}
          abuseCaseIds={[addThreatFor.id]}
          targetName={addThreatFor.name}
        />
      )}

      <LinkThreatDialog
        threatModelId={threatModelId}
        abuseCase={linkThreatFor}
        threats={threats}
        open={linkThreatFor !== null}
        onOpenChange={(open) => {
          if (!open) setLinkThreatFor(null)
        }}
      />

      <AlertDialog
        open={deleteAbuseCaseFor !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAbuseCaseFor(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete abuse case?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes "{deleteAbuseCaseFor?.name}". Its threats stay in the model. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAbuseCase.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleConfirmDeleteAbuseCase()
              }}
              disabled={deleteAbuseCase.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAbuseCase.isPending ? (
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
    </div>
  )
}
