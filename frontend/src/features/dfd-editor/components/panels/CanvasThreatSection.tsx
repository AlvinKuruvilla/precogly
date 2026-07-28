import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TaxonomyBadges } from '@/components/shared/TaxonomyBadges'
import { useThreatModelThreats } from '@/features/threat-models/api/threats'
import { AddThreatDialog } from '../threat-analysis/AddThreatDialog'
import {
  deriveThreatStatus,
  THREAT_STATUS_CONFIG,
} from '../../types/threat-analysis'
import type { ComponentThreat } from '../../types/threat-analysis'

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

interface CanvasThreatSectionProps {
  threatModelId: string | undefined
  canvasId: string
  targetType: 'component' | 'dataflow'
  targetName: string
  backendId: number | undefined
}

export function CanvasThreatSection({
  threatModelId,
  canvasId,
  targetType,
  targetName,
  backendId,
}: CanvasThreatSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const { data: threatData } = useThreatModelThreats(threatModelId)

  const threats: ComponentThreat[] = threatData?.componentThreats
    ? threatData.componentThreats.filter(
        (t) => t.componentId === canvasId && !t.dismissed
      )
    : []

  const threatCount = threats.length

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm font-medium hover:text-foreground text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <ShieldAlert className="h-4 w-4" />
          <span>Threats</span>
          {threatCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {threatCount}
            </Badge>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="space-y-2 pl-6">
          {backendId === undefined ? (
            <p className="text-xs text-muted-foreground">
              Save the diagram to enable threat management.
            </p>
          ) : (
            <>
              {threats.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No threats added yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {threats.map((threat) => {
                    const status = deriveThreatStatus(threat.countermeasures)
                    const statusConfig = THREAT_STATUS_CONFIG[status]

                    return (
                      <div
                        key={threat.id}
                        className="flex flex-col gap-1.5 p-2 rounded-md border bg-card text-sm"
                      >
                        <span className="text-sm font-medium leading-snug">
                          {threat.threatName || 'Unnamed threat'}
                        </span>
                        {threat.threatDescription && (
                          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                            {threat.threatDescription}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1">
                          {threat.inherentSeverity && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-xs',
                                SEVERITY_COLORS[threat.inherentSeverity] || ''
                              )}
                            >
                              {threat.inherentSeverity}
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn('text-xs', statusConfig.bgColor)}
                          >
                            {statusConfig.label}
                          </Badge>
                        </div>
                        {threat.taxonomyEntries && threat.taxonomyEntries.length > 0 && (
                          <TaxonomyBadges
                            entries={threat.taxonomyEntries}
                            maxVisible={3}
                            size="sm"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-3 w-3" />
                Add Threat
              </Button>

              <AddThreatDialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                targetId={backendId}
                targetType={targetType}
                targetName={targetName}
                threatModelId={threatModelId}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
