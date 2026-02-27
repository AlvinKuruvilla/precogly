import { useMemo } from "react"
import { ComponentSidebar, SYSTEM_SCOPE_ID } from "./ComponentSidebar"
import { ThreatsList } from "./ThreatsList"
import { CountermeasurePanel } from "./CountermeasurePanel"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import type { ControlStatus, Impact, Likelihood, Priority } from "@/types/tmbom"
import type { AddThreatPayload, AddControlPayload } from "@/hooks/useWorkspaceState"
import type { WorkspaceState } from "@/types/workspace"

interface ThreatAnalysisViewProps {
  state: WorkspaceState
  onSelectComponent: (componentId: string) => void
  onSelectThreat: (threatId: string) => void
  onAddThreat: (payload: AddThreatPayload) => void
  onAddControl: (payload: AddControlPayload) => void
  onDismissThreat: (threatId: string) => void
  onRestoreThreat: (threatId: string) => void
  onChangeControlStatus: (symbolicName: string, status: ControlStatus) => void
  onChangeControlPriority: (
    symbolicName: string,
    priority: Priority
  ) => void
  onSetThreatRisk: (
    threatId: string,
    fields: { likelihood?: Likelihood; impact?: Impact }
  ) => void
}

export function ThreatAnalysisView({
  state,
  onSelectComponent,
  onSelectThreat,
  onAddThreat,
  onAddControl,
  onDismissThreat,
  onRestoreThreat,
  onChangeControlStatus,
  onChangeControlPriority,
  onSetThreatRisk,
}: ThreatAnalysisViewProps) {
  const selectedElement = useMemo(() => {
    if (!state.selectedComponentId) return null
    if (state.selectedComponentId === SYSTEM_SCOPE_ID)
      return { symbolicName: "", title: "System & Process" }
    const component = state.components.find(
      (c) => c.symbolicName === state.selectedComponentId
    )
    if (component) return { symbolicName: component.symbolicName, title: component.title }
    const dataFlow = state.dataFlows.find(
      (df) => df.symbolicName === state.selectedComponentId
    )
    if (dataFlow) return { symbolicName: dataFlow.symbolicName, title: dataFlow.title }
    return null
  }, [state.components, state.dataFlows, state.selectedComponentId])

  const selectedThreat = useMemo(
    () =>
      state.threats.find((t) => t.id === state.selectedThreatId) ?? null,
    [state.threats, state.selectedThreatId]
  )

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="20%" minSize="12%" maxSize="35%">
          <ComponentSidebar
            trustZones={state.trustZones}
            trustBoundaries={state.trustBoundaries}
            components={state.components}
            dataFlows={state.dataFlows}
            dataSets={state.dataSets}
            assumptions={state.assumptions}
            threats={state.threats}
            selectedComponentId={state.selectedComponentId}
            onSelectComponent={onSelectComponent}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="35%" minSize="20%" maxSize="55%">
          <ThreatsList
            selectedElement={selectedElement}
            threats={state.threats}
            threatPersonas={state.threatPersonas}
            selectedThreatId={state.selectedThreatId}
            onSelectThreat={onSelectThreat}
            onDismissThreat={onDismissThreat}
            onRestoreThreat={onRestoreThreat}
            onSetThreatRisk={onSetThreatRisk}
            onAddThreat={onAddThreat}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="45%" minSize="20%">
          <CountermeasurePanel
            selectedThreat={selectedThreat}
            controls={state.controls}
            trustZones={state.trustZones}
            allThreats={state.threats}
            onChangeControlStatus={onChangeControlStatus}
            onChangeControlPriority={onChangeControlPriority}
            onAddControl={onAddControl}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
