import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export function SeverityAssessmentPanel({
  threat,
  onSave,
  isSaving = false,
}: {
  threat: ComponentThreat
  onSave: (data: { severityScoringMetadata: Record<string, unknown>; inherentSeverity: string }) => void
  isSaving?: boolean
}) {
  const metadata = (threat.severityScoringMetadata || {}) as Record<string, unknown>
  const [likelihood, setLikelihood] = useState<string>((metadata.likelihood as string) || '')
  const [impact, setImpact] = useState<string>((metadata.impact as string) || '')
  const [rationale, setRationale] = useState<string>((metadata.rationale as string) || '')
  const [severityOverride, setSeverityOverride] = useState<string>('')

  const computedSeverity = likelihood && impact ? computeSeverity(likelihood, impact) : null
  const effectiveSeverity = severityOverride || computedSeverity || threat.inherentSeverity || 'medium'

  const hasChanges = useMemo(() => {
    const currentLikelihood = (metadata.likelihood as string) || ''
    const currentImpact = (metadata.impact as string) || ''
    const currentRationale = (metadata.rationale as string) || ''
    return likelihood !== currentLikelihood || impact !== currentImpact || rationale !== currentRationale || !!severityOverride
  }, [likelihood, impact, rationale, severityOverride, metadata])

  const handleSave = () => {
    const newMetadata: Record<string, unknown> = { ...metadata, likelihood, impact, rationale }
    if (severityOverride) {
      newMetadata.severity_override = severityOverride
    }
    onSave({ severityScoringMetadata: newMetadata, inherentSeverity: effectiveSeverity })
    setSeverityOverride('')
  }

  return (
    <div className="mt-2 ml-4 p-2 rounded-md bg-slate-50 border border-slate-200 space-y-2" onClick={(e) => e.stopPropagation()}>
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
          {computedSeverity !== threat.inherentSeverity && !severityOverride && (
            <span className="text-[10px] text-muted-foreground">(current: {threat.inherentSeverity})</span>
          )}
        </div>
      )}
      {computedSeverity && (
        <div>
          <label className="text-[10px] text-muted-foreground">Override severity</label>
          <Select value={severityOverride} onValueChange={setSeverityOverride}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Use computed value" />
            </SelectTrigger>
            <SelectContent>
              {['low', 'medium', 'high', 'critical'].map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <label className="text-[10px] text-muted-foreground">Rationale</label>
        <Textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Optional rationale for severity assessment..."
          className="h-14 text-xs resize-none"
        />
      </div>
      {hasChanges && (
        <Button size="sm" className="h-6 text-xs w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...</>
          ) : (
            'Save Assessment'
          )}
        </Button>
      )}
    </div>
  )
}
