import { User, Cog, Database, ChevronDown, ChevronRight, ArrowRight, Lock, Unlock, Globe } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { getRiskLevel, RISK_LEVEL_COLORS } from "@/lib/risk-calculator"
import type {
  AssumptionUI,
  ComponentUI,
  DataFlowUI,
  DataSetUI,
  ThreatInstanceUI,
  TrustBoundaryUI,
  TrustZoneUI,
} from "@/types/workspace"

export const SYSTEM_SCOPE_ID = "__system__"

interface ComponentSidebarProps {
  trustZones: TrustZoneUI[]
  trustBoundaries: TrustBoundaryUI[]
  components: ComponentUI[]
  dataFlows: DataFlowUI[]
  dataSets: DataSetUI[]
  assumptions: AssumptionUI[]
  threats: ThreatInstanceUI[]
  selectedComponentId: string | null
  onSelectComponent: (componentId: string) => void
}

const CATEGORY_ICON = {
  actor: User,
  component: Cog,
  dataStore: Database,
} as const

function getWorstThreatStatus(
  componentSymbolicName: string,
  threats: ThreatInstanceUI[]
): "exposed" | "addressable" | "mitigated" | null {
  const componentThreats = threats.filter(
    (t) => t.componentAffected === componentSymbolicName && !t.dismissed
  )
  if (componentThreats.length === 0) return null
  if (componentThreats.some((t) => t.status === "exposed")) return "exposed"
  if (componentThreats.some((t) => t.status === "addressable"))
    return "addressable"
  return "mitigated"
}

function getHighestResidualRisk(
  componentSymbolicName: string,
  threats: ThreatInstanceUI[]
): number | null {
  const assessedThreats = threats.filter(
    (t) =>
      t.componentAffected === componentSymbolicName &&
      !t.dismissed &&
      t.residualScore !== null
  )
  if (assessedThreats.length === 0) return null
  return Math.max(...assessedThreats.map((t) => t.residualScore!))
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  exposed: "bg-red-100 text-red-700 border-red-200",
  addressable: "bg-amber-100 text-amber-700 border-amber-200",
  mitigated: "bg-green-100 text-green-700 border-green-200",
}

const VALIDITY_BADGE_COLORS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700 border-green-200",
  unconfirmed: "bg-amber-100 text-amber-700 border-amber-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
}

export function ComponentSidebar({
  trustZones,
  trustBoundaries,
  components,
  dataFlows,
  dataSets,
  assumptions,
  threats,
  selectedComponentId,
  onSelectComponent,
}: ComponentSidebarProps) {
  const [expandedZones, setExpandedZones] = useState<Set<string>>(
    () => new Set(trustZones.map((tz) => tz.symbolicName))
  )

  const toggleZone = (zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev)
      if (next.has(zoneId)) next.delete(zoneId)
      else next.add(zoneId)
      return next
    })
  }

  const totalComponents = components.length
  const totalBoundaries = trustBoundaries.length
  const totalFlows = dataFlows.length
  const activeThreats = threats.filter((t) => !t.dismissed)
  const exposedCount = activeThreats.filter(
    (t) => t.status === "exposed"
  ).length

  // Group components by trust zone
  const componentsByZone = new Map<string, ComponentUI[]>()
  for (const component of components) {
    const zoneKey = component.trustZone || "_unassigned"
    const existing = componentsByZone.get(zoneKey) ?? []
    existing.push(component)
    componentsByZone.set(zoneKey, existing)
  }

  // Resolve zone names for trust boundaries
  const zoneNameMap = new Map(
    trustZones.map((tz) => [tz.symbolicName, tz.title])
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">Components & Boundaries</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {totalComponents} components | {totalBoundaries} boundaries |{" "}
          {totalFlows} flows
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {activeThreats.length} threats
          </span>
          {exposedCount > 0 && (
            <Badge
              variant="outline"
              className="border-red-200 bg-red-100 text-xs text-red-700"
            >
              {exposedCount} exposed
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" type="always">
        <div className="p-2">
          {(() => {
            const systemThreatCount = threats.filter(
              (t) => t.componentAffected === "" && !t.dismissed
            ).length
            const isSystemSelected = selectedComponentId === SYSTEM_SCOPE_ID
            const systemWorstStatus = getWorstThreatStatus("", threats)
            const systemHighestRisk = getHighestResidualRisk("", threats)

            return (
              <>
                <button
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    isSystemSelected
                      ? "bg-accent font-medium"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => onSelectComponent(SYSTEM_SCOPE_ID)}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">System &amp; Process</span>
                  {systemThreatCount > 0 && systemHighestRisk !== null ? (
                    (() => {
                      const riskLevel = getRiskLevel(systemHighestRisk)
                      const colors = RISK_LEVEL_COLORS[riskLevel]
                      return (
                        <Badge
                          variant="outline"
                          className={cn(
                            "ml-auto shrink-0 text-[10px] font-mono",
                            colors.bg,
                            colors.text
                          )}
                        >
                          {systemHighestRisk}
                        </Badge>
                      )
                    })()
                  ) : (
                    systemThreatCount > 0 && systemWorstStatus && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-auto shrink-0 text-[10px]",
                          STATUS_BADGE_COLORS[systemWorstStatus]
                        )}
                      >
                        {systemThreatCount}
                      </Badge>
                    )
                  )}
                </button>
                <Separator className="my-2" />
              </>
            )
          })()}

          {trustZones.map((zone) => {
            const zoneComponents = componentsByZone.get(zone.symbolicName) ?? []
            const isExpanded = expandedZones.has(zone.symbolicName)

            return (
              <div key={zone.symbolicName} className="mb-1">
                <button
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-accent"
                  onClick={() => toggleZone(zone.symbolicName)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{zone.title}</span>
                </button>

                {isExpanded && (
                  <div className="ml-2 space-y-0.5 pl-3">
                    {zoneComponents.map((component) => {
                      const Icon = CATEGORY_ICON[component.category]
                      const threatCount = threats.filter(
                        (t) =>
                          t.componentAffected === component.symbolicName &&
                          !t.dismissed
                      ).length
                      const worstStatus = getWorstThreatStatus(
                        component.symbolicName,
                        threats
                      )
                      const highestRisk = getHighestResidualRisk(
                        component.symbolicName,
                        threats
                      )
                      const isSelected =
                        selectedComponentId === component.symbolicName

                      return (
                        <button
                          key={component.symbolicName}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            isSelected
                              ? "bg-accent font-medium"
                              : "hover:bg-accent/50"
                          )}
                          onClick={() =>
                            onSelectComponent(component.symbolicName)
                          }
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{component.title}</div>
                            {component.actorType && (
                              <div className="truncate text-[10px] text-muted-foreground">
                                {component.actorType}
                              </div>
                            )}
                            {component.dataStoreType && (
                              <div className="truncate text-[10px] text-muted-foreground">
                                {component.dataStoreType}
                              </div>
                            )}
                          </div>
                          {threatCount > 0 && highestRisk !== null ? (
                            (() => {
                              const riskLevel = getRiskLevel(highestRisk)
                              const colors = RISK_LEVEL_COLORS[riskLevel]
                              return (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "ml-auto shrink-0 text-[10px] font-mono",
                                    colors.bg,
                                    colors.text
                                  )}
                                >
                                  {highestRisk}
                                </Badge>
                              )
                            })()
                          ) : (
                            threatCount > 0 && worstStatus && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "ml-auto shrink-0 text-[10px]",
                                  STATUS_BADGE_COLORS[worstStatus]
                                )}
                              >
                                {threatCount}
                              </Badge>
                            )
                          )}
                        </button>
                      )
                    })}
                    {zoneComponents.length === 0 && (
                      <p className="px-2 py-1 text-[10px] text-muted-foreground italic">
                        No components
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {trustBoundaries.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Trust Boundaries
              </div>
              {trustBoundaries.map((boundary, index) => (
                <div
                  key={index}
                  className="rounded-md px-2 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-1 font-medium">
                    <span className="truncate">
                      {zoneNameMap.get(boundary.trustZoneA) ??
                        boundary.trustZoneA}
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {zoneNameMap.get(boundary.trustZoneB) ??
                        boundary.trustZoneB}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {boundary.authenticationMethods.map((method) => (
                      <span
                        key={method}
                        className="text-[10px] text-muted-foreground"
                      >
                        Auth: {method}
                      </span>
                    ))}
                    {boundary.accessControlMethods.map((method) => (
                      <span
                        key={method}
                        className="text-[10px] text-muted-foreground"
                      >
                        Access: {method.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {dataFlows.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Data Flows
              </div>
              {dataFlows.map((flow) => {
                const sourceComponent = components.find(
                  (c) => c.symbolicName === flow.source.name
                )
                const destComponent = components.find(
                  (c) => c.symbolicName === flow.destination.name
                )
                const flowThreatCount = threats.filter(
                  (t) =>
                    t.componentAffected === flow.symbolicName && !t.dismissed
                ).length
                const isFlowSelected =
                  selectedComponentId === flow.symbolicName

                return (
                  <button
                    key={flow.symbolicName}
                    className={cn(
                      "flex w-full flex-col rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      isFlowSelected
                        ? "bg-accent font-medium"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => onSelectComponent(flow.symbolicName)}
                  >
                    <div className="flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">
                        {flow.title}
                      </span>
                      {flowThreatCount > 0 && (
                        <Badge
                          variant="outline"
                          className="ml-auto shrink-0 border-red-200 bg-red-100 text-[10px] text-red-700"
                        >
                          {flowThreatCount}
                        </Badge>
                      )}
                    </div>
                    <div className="ml-4 text-[10px] text-muted-foreground">
                      {sourceComponent?.title ?? flow.source.name} →{" "}
                      {destComponent?.title ?? flow.destination.name}
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {dataSets.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Data Sets
              </div>
              {dataSets.map((dataSet) => {
                const dataStoreNames = dataSet.placements.map((p) => {
                  const store = components.find(
                    (c) => c.symbolicName === p.dataStore
                  )
                  return { title: store?.title ?? p.dataStore, encrypted: p.encrypted }
                })

                return (
                  <div
                    key={dataSet.symbolicName}
                    className="rounded-md px-2 py-1.5 text-xs"
                  >
                    <div className="truncate font-medium">{dataSet.title}</div>
                    {dataStoreNames.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        {dataStoreNames.map((placement, placementIndex) => (
                          <span
                            key={placementIndex}
                            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"
                          >
                            {placement.encrypted ? (
                              <Lock className="h-2.5 w-2.5" />
                            ) : (
                              <Unlock className="h-2.5 w-2.5" />
                            )}
                            {placement.title}
                          </span>
                        ))}
                      </div>
                    )}
                    {dataSet.dataSensitivity.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {dataSet.dataSensitivity.map((sensitivity) => (
                          <Badge
                            key={sensitivity}
                            variant="secondary"
                            className="text-[10px] uppercase"
                          >
                            {sensitivity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {assumptions.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assumptions
              </div>
              {assumptions.map((assumption, assumptionIndex) => (
                <div
                  key={assumptionIndex}
                  className="rounded-md px-2 py-1.5 text-xs"
                >
                  <div className="flex items-start gap-1.5">
                    <span className="line-clamp-2 flex-1 text-muted-foreground">
                      {assumption.description}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[10px]",
                        VALIDITY_BADGE_COLORS[assumption.validity]
                      )}
                    >
                      {assumption.validity}
                    </Badge>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
