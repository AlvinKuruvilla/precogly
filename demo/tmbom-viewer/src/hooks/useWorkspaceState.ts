import { useReducer, useCallback } from "react"
import type { ControlStatus, Impact, Likelihood, Priority, ThreatSource } from "@/types/tmbom"
import type { ThreatDerivedStatus, ThreatInstanceUI, WorkspaceState } from "@/types/workspace"
import {
  calculateInherentScore,
  calculateResidualScore,
  getRiskLevel,
} from "@/lib/risk-calculator"

export interface AddThreatPayload {
  title: string
  description: string
  componentAffected: string
  threatPersona: string
  event: string
  sources: ThreatSource[]
}

export interface AddControlPayload {
  title: string
  description: string
  threats: string[]
  status: ControlStatus
  priority: Priority
}

const MITIGATED_STATUSES = new Set(["active", "approved", "assumed"])

function recomputeThreatStatus(
  threatSymbolicName: string,
  controls: WorkspaceState["controls"]
): ThreatDerivedStatus {
  const linkedControls = controls.filter((control) =>
    control.threats.includes(threatSymbolicName)
  )

  if (linkedControls.length === 0) return "exposed"

  const allMitigated = linkedControls.every((control) =>
    MITIGATED_STATUSES.has(control.status)
  )
  if (allMitigated) return "mitigated"

  const anySuggested = linkedControls.some(
    (control) => control.status === "suggested"
  )
  if (anySuggested) return "exposed"

  return "addressable"
}

type WorkspaceAction =
  | { type: "IMPORT_FILE"; payload: WorkspaceState }
  | { type: "SELECT_COMPONENT"; payload: string | null }
  | { type: "SELECT_THREAT"; payload: string | null }
  | {
      type: "CHANGE_CONTROL_STATUS"
      payload: { symbolicName: string; status: ControlStatus }
    }
  | {
      type: "CHANGE_CONTROL_PRIORITY"
      payload: { symbolicName: string; priority: Priority }
    }
  | { type: "ADD_THREAT"; payload: AddThreatPayload }
  | { type: "ADD_CONTROL"; payload: AddControlPayload }
  | { type: "DISMISS_THREAT"; payload: string }
  | { type: "RESTORE_THREAT"; payload: string }
  | {
      type: "SET_THREAT_RISK"
      payload: {
        threatId: string
        likelihood?: Likelihood
        impact?: Impact
      }
    }
  | { type: "RESET" }

const initialState: WorkspaceState = {
  loaded: false,
  fileName: "",
  version: "",
  description: "",
  frozen: false,
  reviewedAt: null,
  repoLink: null,
  releaseDocsLink: null,
  scope: {
    title: "",
    description: "",
    businessCriticality: "",
    dataSensitivity: [],
    exposure: "",
    tier: "",
  },
  trustZones: [],
  trustBoundaries: [],
  components: [],
  dataFlows: [],
  dataSets: [],
  threatPersonas: [],
  threats: [],
  controls: [],
  risks: [],
  assumptions: [],
  selectedComponentId: null,
  selectedThreatId: null,
}

function recomputeThreatRiskScores(
  threat: ThreatInstanceUI,
  controls: WorkspaceState["controls"]
): Pick<ThreatInstanceUI, "inherentScore" | "residualScore" | "riskLevel"> {
  if (threat.likelihood === null || threat.impact === null) {
    return { inherentScore: null, residualScore: null, riskLevel: null }
  }

  const inherentScore = calculateInherentScore(threat.likelihood, threat.impact)
  const linkedControls = controls.filter((control) =>
    control.threats.includes(threat.symbolicName)
  )
  const residualScore = calculateResidualScore(inherentScore, linkedControls)
  const riskLevel = getRiskLevel(residualScore)

  return { inherentScore, residualScore, riskLevel }
}

function recomputeAllThreatStatuses(state: WorkspaceState): WorkspaceState {
  return {
    ...state,
    threats: state.threats.map((threat) => ({
      ...threat,
      ...(threat.dismissed
        ? {}
        : { status: recomputeThreatStatus(threat.symbolicName, state.controls) }),
      ...recomputeThreatRiskScores(threat, state.controls),
    })),
  }
}

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case "IMPORT_FILE":
      return action.payload

    case "SELECT_COMPONENT":
      return {
        ...state,
        selectedComponentId: action.payload,
        selectedThreatId: null,
      }

    case "SELECT_THREAT":
      return { ...state, selectedThreatId: action.payload }

    case "CHANGE_CONTROL_STATUS": {
      const updatedControls = state.controls.map((control) =>
        control.symbolicName === action.payload.symbolicName
          ? { ...control, status: action.payload.status }
          : control
      )
      return recomputeAllThreatStatuses({
        ...state,
        controls: updatedControls,
      })
    }

    case "CHANGE_CONTROL_PRIORITY": {
      return {
        ...state,
        controls: state.controls.map((control) =>
          control.symbolicName === action.payload.symbolicName
            ? { ...control, priority: action.payload.priority }
            : control
        ),
      }
    }

    case "ADD_THREAT": {
      const { title, description, componentAffected, threatPersona, event, sources } = action.payload
      const symbolicName = `custom-threat-${Date.now()}`
      const threatId = `${symbolicName}::${componentAffected}`
      const newThreat: ThreatInstanceUI = {
        id: threatId,
        symbolicName,
        title,
        description,
        componentAffected,
        threatPersona: threatPersona || undefined,
        event,
        sources,
        attackMechanisms: [],
        weaknesses: [],
        dismissed: false,
        status: recomputeThreatStatus(symbolicName, state.controls),
        likelihood: null,
        impact: null,
        inherentScore: null,
        residualScore: null,
        riskLevel: null,
      }
      return {
        ...state,
        threats: [...state.threats, newThreat],
      }
    }

    case "ADD_CONTROL": {
      const { title, description, threats, status, priority } = action.payload
      const symbolicName = `custom-control-${Date.now()}`
      const newControl = {
        symbolicName,
        title,
        description,
        threats,
        status,
        priority,
      }
      return recomputeAllThreatStatuses({
        ...state,
        controls: [...state.controls, newControl],
      })
    }

    case "DISMISS_THREAT":
      return {
        ...state,
        threats: state.threats.map((threat) =>
          threat.id === action.payload
            ? { ...threat, dismissed: true }
            : threat
        ),
      }

    case "RESTORE_THREAT":
      return {
        ...state,
        threats: state.threats.map((threat) =>
          threat.id === action.payload
            ? { ...threat, dismissed: false }
            : threat
        ),
      }

    case "SET_THREAT_RISK": {
      const { threatId, likelihood, impact } = action.payload
      return {
        ...state,
        threats: state.threats.map((threat) => {
          if (threat.id !== threatId) return threat

          const updatedThreat = {
            ...threat,
            ...(likelihood !== undefined ? { likelihood } : {}),
            ...(impact !== undefined ? { impact } : {}),
          }

          return {
            ...updatedThreat,
            ...recomputeThreatRiskScores(updatedThreat, state.controls),
          }
        }),
      }
    }

    case "RESET":
      return initialState

    default:
      return state
  }
}

export function useWorkspaceState() {
  const [state, dispatch] = useReducer(workspaceReducer, initialState)

  const importFile = useCallback(
    (workspaceState: WorkspaceState) => {
      dispatch({ type: "IMPORT_FILE", payload: workspaceState })
    },
    []
  )

  const selectComponent = useCallback((componentId: string | null) => {
    dispatch({ type: "SELECT_COMPONENT", payload: componentId })
  }, [])

  const selectThreat = useCallback((threatId: string | null) => {
    dispatch({ type: "SELECT_THREAT", payload: threatId })
  }, [])

  const changeControlStatus = useCallback(
    (symbolicName: string, status: ControlStatus) => {
      dispatch({
        type: "CHANGE_CONTROL_STATUS",
        payload: { symbolicName, status },
      })
    },
    []
  )

  const changeControlPriority = useCallback(
    (symbolicName: string, priority: Priority) => {
      dispatch({
        type: "CHANGE_CONTROL_PRIORITY",
        payload: { symbolicName, priority },
      })
    },
    []
  )

  const addThreat = useCallback((payload: AddThreatPayload) => {
    dispatch({ type: "ADD_THREAT", payload })
  }, [])

  const addControl = useCallback((payload: AddControlPayload) => {
    dispatch({ type: "ADD_CONTROL", payload })
  }, [])

  const dismissThreat = useCallback((threatId: string) => {
    dispatch({ type: "DISMISS_THREAT", payload: threatId })
  }, [])

  const restoreThreat = useCallback((threatId: string) => {
    dispatch({ type: "RESTORE_THREAT", payload: threatId })
  }, [])

  const setThreatRisk = useCallback(
    (
      threatId: string,
      fields: { likelihood?: Likelihood; impact?: Impact }
    ) => {
      dispatch({ type: "SET_THREAT_RISK", payload: { threatId, ...fields } })
    },
    []
  )

  const reset = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  return {
    state,
    importFile,
    selectComponent,
    selectThreat,
    addThreat,
    addControl,
    changeControlStatus,
    changeControlPriority,
    dismissThreat,
    restoreThreat,
    setThreatRisk,
    reset,
  }
}
