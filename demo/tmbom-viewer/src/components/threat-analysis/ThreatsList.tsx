import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThreatCard } from "./ThreatCard"
import { AddThreatDialog } from "./AddThreatDialog"
import type { Impact, Likelihood } from "@/types/tmbom"
import type { AddThreatPayload } from "@/hooks/useWorkspaceState"
import type {
  ThreatInstanceUI,
  ThreatPersonaUI,
} from "@/types/workspace"

interface SelectedElement {
  symbolicName: string
  title: string
}

interface ThreatsListProps {
  selectedElement: SelectedElement | null
  threats: ThreatInstanceUI[]
  threatPersonas: ThreatPersonaUI[]
  selectedThreatId: string | null
  onSelectThreat: (threatId: string) => void
  onDismissThreat: (threatId: string) => void
  onRestoreThreat: (threatId: string) => void
  onSetThreatRisk: (
    threatId: string,
    fields: { likelihood?: Likelihood; impact?: Impact }
  ) => void
  onAddThreat?: (payload: AddThreatPayload) => void
}

export function ThreatsList({
  selectedElement,
  threats,
  threatPersonas,
  selectedThreatId,
  onSelectThreat,
  onDismissThreat,
  onRestoreThreat,
  onSetThreatRisk,
  onAddThreat,
}: ThreatsListProps) {
  const [dismissedExpanded, setDismissedExpanded] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const personaMap = useMemo(
    () =>
      new Map(
        threatPersonas.map((tp) => [tp.symbolicName, tp])
      ),
    [threatPersonas]
  )

  const componentThreats = useMemo(() => {
    if (!selectedElement) return []
    return threats.filter(
      (t) => t.componentAffected === selectedElement.symbolicName
    )
  }, [threats, selectedElement])

  const activeThreats = useMemo(() => {
    const active = componentThreats.filter((t) => !t.dismissed)
    return active.sort((a, b) => {
      // Assessed threats first, unassessed at bottom
      if (a.residualScore !== null && b.residualScore === null) return -1
      if (a.residualScore === null && b.residualScore !== null) return 1
      if (a.residualScore === null && b.residualScore === null) return 0
      // Higher residual risk first
      return b.residualScore! - a.residualScore!
    })
  }, [componentThreats])
  const dismissedThreats = componentThreats.filter((t) => t.dismissed)

  if (!selectedElement) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-3">
          <h2 className="text-sm font-semibold">Threats</h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-center text-sm text-muted-foreground">
            Select a component or data flow from the sidebar to view its threats
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Threats — {selectedElement.title}
          </h2>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {activeThreats.length}
            </Badge>
            {onAddThreat && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setAddDialogOpen(true)}
                title="Add threat"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Cross out threats that are not relevant
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1" type="always">
        <div className="space-y-2 p-3">
          {activeThreats.map((threat) => (
            <ThreatCard
              key={threat.id}
              threat={threat}
              threatPersona={
                threat.threatPersona
                  ? personaMap.get(threat.threatPersona)
                  : undefined
              }
              isSelected={selectedThreatId === threat.id}
              onSelect={() => onSelectThreat(threat.id)}
              onDismiss={() => onDismissThreat(threat.id)}
              onSetLikelihood={(likelihood) =>
                onSetThreatRisk(threat.id, { likelihood })
              }
              onSetImpact={(impact) =>
                onSetThreatRisk(threat.id, { impact })
              }
            />
          ))}

          {activeThreats.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active threats for this component
            </p>
          )}

          {dismissedThreats.length > 0 && (
            <div className="mt-4">
              <button
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setDismissedExpanded(!dismissedExpanded)}
              >
                {dismissedExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span>Dismissed</span>
                <Badge variant="outline" className="ml-1 text-[10px]">
                  {dismissedThreats.length}
                </Badge>
              </button>

              {dismissedExpanded && (
                <div className="mt-1 space-y-2">
                  {dismissedThreats.map((threat) => (
                    <ThreatCard
                      key={threat.id}
                      threat={threat}
                      threatPersona={
                        threat.threatPersona
                          ? personaMap.get(threat.threatPersona)
                          : undefined
                      }
                      isSelected={selectedThreatId === threat.id}
                      onSelect={() => onSelectThreat(threat.id)}
                      onDismiss={() => onDismissThreat(threat.id)}
                      onRestore={() => onRestoreThreat(threat.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {onAddThreat && selectedElement && (
        <AddThreatDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          componentAffected={selectedElement.symbolicName}
          threatPersonas={threatPersonas}
          onSubmit={onAddThreat}
        />
      )}
    </div>
  )
}
