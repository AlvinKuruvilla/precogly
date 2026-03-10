import { useState } from "react"
import { X, ChevronDown, ChevronRight, Skull, Undo2, ArrowDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  LIKELIHOOD_OPTIONS,
  IMPACT_OPTIONS,
  RISK_LEVEL_COLORS,
  getRiskLevel,
  type RiskLevel,
} from "@/lib/risk-calculator"
import type { Impact, Likelihood } from "@/types/tmbom"
import type { ThreatInstanceUI, ThreatPersonaUI } from "@/types/workspace"

interface ThreatCardProps {
  threat: ThreatInstanceUI
  threatPersona?: ThreatPersonaUI
  isSelected: boolean
  onSelect: () => void
  onDismiss: () => void
  onRestore?: () => void
  onSetLikelihood?: (likelihood: Likelihood) => void
  onSetImpact?: (impact: Impact) => void
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  exposed: { bg: "bg-red-100", text: "text-red-700", label: "Exposed" },
  addressable: { bg: "bg-amber-100", text: "text-amber-700", label: "Addressable" },
  mitigated: { bg: "bg-green-100", text: "text-green-700", label: "Mitigated" },
}

const SOURCE_COLORS: Record<string, string> = {
  adversary: "bg-red-50 text-red-600 border-red-200",
  human_error: "bg-amber-50 text-amber-600 border-amber-200",
  failure: "bg-orange-50 text-orange-600 border-orange-200",
  events_beyond_org_control: "bg-blue-50 text-blue-600 border-blue-200",
}

function formatSourceLabel(source: string): string {
  return source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ThreatCard({
  threat,
  threatPersona,
  isSelected,
  onSelect,
  onDismiss,
  onRestore,
  onSetLikelihood,
  onSetImpact,
}: ThreatCardProps) {
  const [referencesExpanded, setReferencesExpanded] = useState(false)
  const statusStyle = STATUS_STYLES[threat.status]
  const totalReferences =
    threat.attackMechanisms.length + threat.weaknesses.length

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border p-3 transition-colors",
        isSelected ? "border-primary bg-accent/50" : "hover:bg-accent/30",
        threat.dismissed && "opacity-60"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                statusStyle.bg,
                threat.status === "exposed" && "bg-red-500",
                threat.status === "addressable" && "bg-amber-500",
                threat.status === "mitigated" && "bg-green-500"
              )}
            />
            <span className="truncate text-sm font-medium">
              {threat.title}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {threat.event}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {threat.riskLevel !== null && threat.residualScore !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-mono",
                RISK_LEVEL_COLORS[threat.riskLevel as RiskLevel].bg,
                RISK_LEVEL_COLORS[threat.riskLevel as RiskLevel].text
              )}
            >
              R:{threat.residualScore}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn("text-[10px]", statusStyle.bg, statusStyle.text)}
          >
            {statusStyle.label}
          </Badge>
          {threat.dismissed ? (
            onRestore && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onRestore()
                }}
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            )
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Sources */}
      <div className="mt-2 flex flex-wrap gap-1">
        {threat.sources.map((source) => (
          <Badge
            key={source}
            variant="outline"
            className={cn("text-[10px]", SOURCE_COLORS[source])}
          >
            {formatSourceLabel(source)}
          </Badge>
        ))}
      </div>

      {/* Threat Persona */}
      {threatPersona && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Skull className="h-3.5 w-3.5" />
          <span className="font-medium">{threatPersona.title}</span>
          <span className="text-[10px]">
            ({threatPersona.skillLevel.replace(/_/g, " ")})
          </span>
        </div>
      )}

      {/* Attack References */}
      {totalReferences > 0 && (
        <div className="mt-2">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              setReferencesExpanded(!referencesExpanded)
            }}
          >
            {referencesExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>Attack References</span>
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {totalReferences}
            </Badge>
          </button>

          {referencesExpanded && (
            <div className="mt-1.5 ml-4 space-y-1.5">
              {threat.attackMechanisms.length > 0 && (
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    CAPEC
                  </span>
                  {threat.attackMechanisms.map((capec) => (
                    <div
                      key={capec.capec_id}
                      className="mt-0.5 text-xs text-muted-foreground"
                    >
                      <Badge
                        variant="outline"
                        className="mr-1 text-[10px] font-mono"
                      >
                        CAPEC-{capec.capec_id}
                      </Badge>
                      {capec.capec_title}
                    </div>
                  ))}
                </div>
              )}

              {threat.weaknesses.length > 0 && (
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    CWE
                  </span>
                  {threat.weaknesses.map((cwe) => (
                    <div
                      key={cwe.cwe_id}
                      className="mt-0.5 text-xs text-muted-foreground"
                    >
                      <Badge
                        variant="outline"
                        className="mr-1 text-[10px] font-mono"
                      >
                        CWE-{cwe.cwe_id}
                      </Badge>
                      {cwe.cwe_title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Severity Assessment */}
      {!threat.dismissed && (
        <div className="mt-3 border-t pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Severity Assessment
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-16 text-xs text-muted-foreground">Likelihood</span>
              <Select
                value={threat.likelihood ?? undefined}
                onValueChange={(value) => {
                  onSetLikelihood?.(value as Likelihood)
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue placeholder="Unset" />
                </SelectTrigger>
                <SelectContent>
                  {LIKELIHOOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 text-xs text-muted-foreground">Impact</span>
              <Select
                value={threat.impact ?? undefined}
                onValueChange={(value) => {
                  onSetImpact?.(value as Impact)
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue placeholder="Unset" />
                </SelectTrigger>
                <SelectContent>
                  {IMPACT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {threat.inherentScore !== null && threat.residualScore !== null && threat.riskLevel !== null ? (
            <div className="mt-2 rounded-md border p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Inherent</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-semibold">{threat.inherentScore}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      RISK_LEVEL_COLORS[getRiskLevel(threat.inherentScore)].bg,
                      RISK_LEVEL_COLORS[getRiskLevel(threat.inherentScore)].text
                    )}
                  >
                    {RISK_LEVEL_COLORS[getRiskLevel(threat.inherentScore)].label}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Residual</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-semibold">{threat.residualScore}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      RISK_LEVEL_COLORS[threat.riskLevel as RiskLevel].bg,
                      RISK_LEVEL_COLORS[threat.riskLevel as RiskLevel].text
                    )}
                  >
                    {RISK_LEVEL_COLORS[threat.riskLevel as RiskLevel].label}
                  </Badge>
                  {threat.residualScore < threat.inherentScore && (
                    <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                      <ArrowDown className="h-3 w-3" />
                      from controls
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-muted-foreground italic">
              Set likelihood and impact to calculate severity
            </p>
          )}
        </div>
      )}
    </div>
  )
}
