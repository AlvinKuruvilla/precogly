/**
 * The right column of the threat analysis screen: the countermeasures of the
 * selected scenario. Shared by the component view and the "By use case" view.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Lock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { ResizablePanel } from '@/components/ui/resizable'
import { SortableList } from '@/components/shared/SortableList'
import { useDeleteCountermeasure, useUnlinkCountermeasure } from '@/features/threat-models/api/threats'
import type {
  AnalysisCountermeasure,
  AnalysisThreat,
  ComplianceStandardMapping,
  CountermeasureStatus,
} from '../../types/threat-analysis'
import { deriveThreatStatus } from '../../types/threat-analysis'
import { EditComplianceMappingsDialog } from './EditComplianceMappingsDialog'
import { CountermeasureCard, type Assignee } from './CountermeasureCard'
import { UnattachedControlsBlock } from './UnattachedControlsBlock'
import { NumberBadge } from './NumberBadge'
import { ThreatStatusBadge } from './ThreatList'
import { formatTargetList } from './countermeasure-utils'

export interface CountermeasureColumnProps {
  threatModelId: string
  /** Every scenario shown, for the controls that are linked to no threat. */
  threats: AnalysisThreat[]
  selectedThreat: AnalysisThreat | null
  onSelectThreatByBackendId: (backendThreatId: number) => void
  onCountermeasureStatusChange: (
    threatUiId: string,
    countermeasureId: string,
    status: CountermeasureStatus,
    notes?: string
  ) => void
  onAssignOwner: (threatUiId: string, countermeasureId: string, assignee: Assignee, newStatus?: CountermeasureStatus) => void
  onAddCustomCountermeasure: () => void
  onCountermeasurePriorityChange: (threatUiId: string, countermeasureId: string, priority: AnalysisCountermeasure['priority']) => void
  onCountermeasureDueDateChange: (threatUiId: string, countermeasureId: string, dueDate: string | null) => void
  onCountermeasureExternalTicketChange: (threatUiId: string, countermeasureId: string, externalTicketUrl: string) => void
  onReorderCountermeasures?: (threatUiId: string, reorderedCountermeasures: AnalysisCountermeasure[]) => void
  isSecurityTeam?: boolean
}

export function CountermeasureColumn({
  threatModelId,
  threats,
  selectedThreat,
  onSelectThreatByBackendId,
  onCountermeasureStatusChange,
  onAssignOwner,
  onAddCustomCountermeasure,
  onCountermeasurePriorityChange,
  onCountermeasureDueDateChange,
  onCountermeasureExternalTicketChange,
  onReorderCountermeasures,
  isSecurityTeam,
}: CountermeasureColumnProps) {
  const [editingComplianceFor, setEditingComplianceFor] = useState<{
    backendId: number
    name: string
    mappings: ComplianceStandardMapping[]
  } | null>(null)
  const [deleteCountermeasureConfirmFor, setDeleteCountermeasureConfirmFor] = useState<{
    name: string
    backendId: number
    isShared?: boolean
    threatId: number
  } | null>(null)

  const deleteCountermeasureMutation = useDeleteCountermeasure()
  const unlinkCountermeasureMutation = useUnlinkCountermeasure()

  const sortedCountermeasures = useMemo(
    () =>
      [...(selectedThreat?.countermeasures ?? [])].sort((left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0)),
    [selectedThreat?.countermeasures]
  )
  const totalCountermeasures = selectedThreat?.countermeasures.length ?? 0
  const resolvedCountermeasures = selectedThreat?.countermeasures.filter((countermeasure) => countermeasure.status !== 'gap').length ?? 0

  const handleConfirmDeleteCountermeasure = () => {
    if (!deleteCountermeasureConfirmFor) return
    const { isShared, backendId, threatId } = deleteCountermeasureConfirmFor
    const onSuccess = () => {
      toast.success(isShared ? 'Countermeasure unlinked' : 'Countermeasure removed')
      setDeleteCountermeasureConfirmFor(null)
    }
    const onError = () => toast.error(isShared ? 'Could not unlink the countermeasure' : 'Could not remove the countermeasure')
    unlinkCountermeasureMutation.mutate({ countermeasureId: backendId, threatId }, { onSuccess, onError })
  }

  return (
        <ResizablePanel defaultSize="42%" minSize="20%">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="min-w-0">
                <div className="font-medium">Countermeasures</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {selectedThreat ? (
                    <>
                      <NumberBadge number={selectedThreat.displayNumber} />
                      <span className="truncate">{selectedThreat.threatName}</span>
                      <span className="shrink-0">on {formatTargetList(selectedThreat.targets, 2)}</span>
                    </>
                  ) : (
                    'Select a threat'
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedThreat && <ThreatStatusBadge status={deriveThreatStatus(selectedThreat.countermeasures)} />}
                {selectedThreat && (
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onAddCustomCountermeasure}>
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
            </div>

            {selectedThreat && (
              <div className="flex items-center gap-4 border-b px-4 py-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Platform</span>
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground/40">|</span>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Gap</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">Planned</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Verified</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Waived</span>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="space-y-3 p-4">
                {selectedThreat && sortedCountermeasures.length > 0 && (
                  <SortableList
                    items={sortedCountermeasures}
                    getItemId={(countermeasure) => countermeasure.id}
                    onReorder={(reordered) => {
                      if (onReorderCountermeasures) onReorderCountermeasures(selectedThreat.id, reordered)
                    }}
                    renderItem={(countermeasure, dragHandleRef) => (
                      <CountermeasureCard
                        threatModelId={threatModelId}
                        threat={selectedThreat}
                        countermeasure={countermeasure}
                        dragHandleRef={dragHandleRef}
                        isSecurityTeam={isSecurityTeam}
                        onStatusChange={(countermeasureId, status, notes) =>
                          onCountermeasureStatusChange(selectedThreat.id, countermeasureId, status, notes)
                        }
                        onAssignOwner={(countermeasureId, assignee, newStatus) =>
                          onAssignOwner(selectedThreat.id, countermeasureId, assignee, newStatus)
                        }
                        onPriorityChange={(countermeasureId, priority) =>
                          onCountermeasurePriorityChange(selectedThreat.id, countermeasureId, priority)
                        }
                        onDueDateChange={(countermeasureId, dueDate) =>
                          onCountermeasureDueDateChange(selectedThreat.id, countermeasureId, dueDate)
                        }
                        onExternalTicketChange={(countermeasureId, url) =>
                          onCountermeasureExternalTicketChange(selectedThreat.id, countermeasureId, url)
                        }
                        onRequestDelete={(target) => {
                          if (target.backendCountermeasureId === undefined) return
                          setDeleteCountermeasureConfirmFor({
                            name: target.countermeasureName || target.countermeasureId,
                            backendId: target.backendCountermeasureId,
                            isShared: target.isShared,
                            threatId: selectedThreat.backendThreatId,
                          })
                        }}
                        onEditCompliance={(target) => {
                          if (target.backendCountermeasureId === undefined) return
                          setEditingComplianceFor({
                            backendId: target.backendCountermeasureId,
                            name: target.countermeasureName || target.countermeasureId,
                            mappings: target.standardMappings || [],
                          })
                        }}
                        onSelectThreat={onSelectThreatByBackendId}
                      />
                    )}
                  />
                )}
                {selectedThreat && sortedCountermeasures.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No countermeasures linked to this threat.</p>
                )}
                {!selectedThreat && <UnattachedControlsBlock threatModelId={threatModelId} threats={threats} />}
              </div>
            </ScrollArea>

            {selectedThreat && (
              <div className="flex justify-between border-t px-4 py-2 text-xs text-muted-foreground">
                <span>{totalCountermeasures} countermeasures</span>
                <span>{resolvedCountermeasures} resolved</span>
              </div>
            )}

      {editingComplianceFor && (
        <EditComplianceMappingsDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingComplianceFor(null)
          }}
          countermeasureId={editingComplianceFor.backendId}
          countermeasureName={editingComplianceFor.name}
          libraryMappings={editingComplianceFor.mappings}
        />
      )}

      <AlertDialog
        open={!!deleteCountermeasureConfirmFor}
        onOpenChange={(open) => {
          if (!open) setDeleteCountermeasureConfirmFor(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteCountermeasureConfirmFor?.isShared ? 'Remove countermeasure from this threat?' : 'Remove countermeasure?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCountermeasureConfirmFor?.isShared
                ? `"${deleteCountermeasureConfirmFor.name}" stays linked to the other threats it mitigates.`
                : `"${deleteCountermeasureConfirmFor?.name}" loses its link to this threat. An untouched generated control is deleted; anything edited is kept and listed as not linked to any threat.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinkCountermeasureMutation.isPending || deleteCountermeasureMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleConfirmDeleteCountermeasure()
              }}
              disabled={unlinkCountermeasureMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unlinkCountermeasureMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Removing
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
          </div>
        </ResizablePanel>
  )
}
