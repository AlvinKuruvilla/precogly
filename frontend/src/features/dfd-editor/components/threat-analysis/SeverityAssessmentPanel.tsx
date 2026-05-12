import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ComponentThreat } from '../../types/threat-analysis'
import { LIKELIHOOD_OPTIONS, IMPACT_OPTIONS, computeSeverity, SEVERITY_COLORS } from './severity-utils'

export interface SeverityAssessmentData {
  severityScoringMetadata: Record<string, unknown>
  inherentSeverity: string
}

export function SeverityAssessmentPanel({
  threat,
  onChange,
}: {
  threat: ComponentThreat
  onChange: (data: SeverityAssessmentData) => void
}) {
  const metadata = (threat.severityScoringMetadata || {}) as Record<string, unknown>
  const [likelihood, setLikelihood] = useState<string>((metadata.likelihood as string) || '')
  const [impact, setImpact] = useState<string>((metadata.impact as string) || '')
  const [rationale, setRationale] = useState<string>((metadata.rationale as string) || '')

  // Sync state when threat changes
  useEffect(() => {
    const md = (threat.severityScoringMetadata || {}) as Record<string, unknown>
    setLikelihood((md.likelihood as string) || '')
    setImpact((md.impact as string) || '')
    setRationale((md.rationale as string) || '')
  }, [threat.id, threat.severityScoringMetadata])

  const computedSeverity = likelihood && impact ? computeSeverity(likelihood, impact) : null
  const effectiveSeverity = computedSeverity || threat.inherentSeverity || 'medium'

  // Notify parent whenever form data changes
  useEffect(() => {
    const newMetadata: Record<string, unknown> = { ...metadata, likelihood, impact, rationale }
    onChange({ severityScoringMetadata: newMetadata, inherentSeverity: effectiveSeverity })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likelihood, impact, rationale])

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Severity Assessment</div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground">Likelihood</label>
          <Select value={likelihood} onValueChange={setLikelihood}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {LIKELIHOOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground">Impact</label>
          <Select value={impact} onValueChange={setImpact}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {IMPACT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {computedSeverity && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Computed:</span>
          <Badge variant="outline" className={cn('text-[10px]', SEVERITY_COLORS[computedSeverity])}>
            {computedSeverity}
          </Badge>
          {computedSeverity !== threat.inherentSeverity && (
            <span className="text-[10px] text-muted-foreground">(current: {threat.inherentSeverity})</span>
          )}
        </div>
      )}
      <div>
        <label className="text-[10px] text-muted-foreground">Scoring Rationale</label>
        <Textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why did you choose this likelihood/impact?"
          className="h-14 text-xs resize-none"
        />
      </div>
    </div>
  )
}
