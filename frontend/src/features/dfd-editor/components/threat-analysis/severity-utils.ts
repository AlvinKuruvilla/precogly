export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  none: { label: 'None', color: 'bg-gray-100 text-gray-600' },
  low: { label: 'Low', color: 'bg-blue-100 text-blue-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
}

export const LIKELIHOOD_OPTIONS = [
  { value: 'rare', label: 'Rare' },
  { value: 'unlikely', label: 'Unlikely' },
  { value: 'possible', label: 'Possible' },
  { value: 'likely', label: 'Likely' },
  { value: 'certain', label: 'Certain' },
] as const

export const IMPACT_OPTIONS = [
  { value: 'negligible', label: 'Negligible' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'severe', label: 'Severe' },
] as const

const LIKELIHOOD_VALUES: Record<string, number> = { rare: 1, unlikely: 2, possible: 3, likely: 4, certain: 5 }
const IMPACT_VALUES: Record<string, number> = { negligible: 1, minor: 2, moderate: 3, major: 4, severe: 5 }

export function computeSeverity(likelihood: string, impact: string): string {
  const likelihoodVal = LIKELIHOOD_VALUES[likelihood]
  const impactVal = IMPACT_VALUES[impact]
  if (!likelihoodVal || !impactVal) return 'medium'
  const normalized = Math.round((likelihoodVal * impactVal) / 25 * 100)
  if (normalized <= 25) return 'low'
  if (normalized <= 50) return 'medium'
  if (normalized <= 75) return 'high'
  return 'critical'
}

export const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}
