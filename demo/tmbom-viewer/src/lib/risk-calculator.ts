import type { ControlStatus, Likelihood, Impact } from "@/types/tmbom"
import type { ControlUI } from "@/types/workspace"

export type RiskLevel = "low" | "medium" | "high" | "critical"

export const LIKELIHOOD_VALUES: Record<Likelihood, number> = {
  rare: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  certain: 5,
}

export const IMPACT_VALUES: Record<Impact, number> = {
  negligible: 1,
  minor: 2,
  moderate: 3,
  major: 4,
  severe: 5,
}

export const CONTROL_EFFECTIVENESS: Record<ControlStatus, number> = {
  active: 1.0,
  assumed: 1.0,
  approved: 0.6,
  scheduled: 0.6,
  under_review: 0.3,
  suggested: 0.0,
  retired: 0.0,
  wont_do: 0.0,
}

export const LIKELIHOOD_OPTIONS: { value: Likelihood; label: string }[] = [
  { value: "rare", label: "Rare" },
  { value: "unlikely", label: "Unlikely" },
  { value: "possible", label: "Possible" },
  { value: "likely", label: "Likely" },
  { value: "certain", label: "Certain" },
]

export const IMPACT_OPTIONS: { value: Impact; label: string }[] = [
  { value: "negligible", label: "Negligible" },
  { value: "minor", label: "Minor" },
  { value: "moderate", label: "Moderate" },
  { value: "major", label: "Major" },
  { value: "severe", label: "Severe" },
]

export function calculateInherentScore(
  likelihood: Likelihood,
  impact: Impact
): number {
  return LIKELIHOOD_VALUES[likelihood] * IMPACT_VALUES[impact]
}

export function calculateResidualScore(
  inherentScore: number,
  linkedControls: ControlUI[]
): number {
  if (linkedControls.length === 0) return inherentScore

  const totalEffectiveness = linkedControls.reduce(
    (sum, control) => sum + CONTROL_EFFECTIVENESS[control.status],
    0
  )
  const averageEffectiveness = totalEffectiveness / linkedControls.length

  return Math.max(1, Math.round(inherentScore * (1 - averageEffectiveness)))
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 17) return "critical"
  if (score >= 10) return "high"
  if (score >= 5) return "medium"
  return "low"
}

export const RISK_LEVEL_COLORS: Record<
  RiskLevel,
  { bg: string; text: string; label: string }
> = {
  low: { bg: "bg-green-100", text: "text-green-700", label: "LOW" },
  medium: { bg: "bg-amber-100", text: "text-amber-700", label: "MEDIUM" },
  high: { bg: "bg-orange-100", text: "text-orange-700", label: "HIGH" },
  critical: { bg: "bg-red-100", text: "text-red-700", label: "CRITICAL" },
}
