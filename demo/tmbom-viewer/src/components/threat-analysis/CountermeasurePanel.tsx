import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CountermeasureCard } from "./CountermeasureCard"
import { AddControlDialog } from "./AddControlDialog"
import type { ControlStatus, Priority } from "@/types/tmbom"
import type { AddControlPayload } from "@/hooks/useWorkspaceState"
import type {
  ControlUI,
  ThreatInstanceUI,
  TrustZoneUI,
} from "@/types/workspace"

interface CountermeasurePanelProps {
  selectedThreat: ThreatInstanceUI | null
  controls: ControlUI[]
  trustZones: TrustZoneUI[]
  allThreats: ThreatInstanceUI[]
  onChangeControlStatus: (symbolicName: string, status: ControlStatus) => void
  onChangeControlPriority: (
    symbolicName: string,
    priority: Priority
  ) => void
  onAddControl?: (payload: AddControlPayload) => void
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  exposed: "bg-red-100 text-red-700 border-red-200",
  addressable: "bg-amber-100 text-amber-700 border-amber-200",
  mitigated: "bg-green-100 text-green-700 border-green-200",
}

export function CountermeasurePanel({
  selectedThreat,
  controls,
  trustZones,
  allThreats,
  onChangeControlStatus,
  onChangeControlPriority,
  onAddControl,
}: CountermeasurePanelProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const linkedControls = useMemo(() => {
    if (!selectedThreat) return []
    return controls.filter((control) =>
      control.threats.includes(selectedThreat.symbolicName)
    )
  }, [selectedThreat, controls])

  if (!selectedThreat) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b p-3">
          <h2 className="text-sm font-semibold">Controls</h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-center text-sm text-muted-foreground">
            Select a threat to view its controls
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b p-3">
        <div className="flex items-center justify-between">
          <h2 className="truncate text-sm font-semibold">
            Controls — {selectedThreat.title}
          </h2>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={STATUS_BADGE_STYLES[selectedThreat.status]}
            >
              {selectedThreat.status}
            </Badge>
            {onAddControl && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setAddDialogOpen(true)}
                title="Add control"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { color: "bg-red-500", label: "Suggested" },
            { color: "bg-amber-500", label: "Under Review" },
            { color: "bg-amber-500", label: "Approved" },
            { color: "bg-amber-500", label: "Scheduled" },
            { color: "bg-green-500", label: "Active" },
            { color: "bg-green-500", label: "Assumed" },
            { color: "bg-gray-400", label: "Retired" },
            { color: "bg-gray-400", label: "Won't Do" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
              <span className="text-[10px] text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" type="always">
        <div className="space-y-2 p-3">
          {linkedControls.map((control) => (
            <CountermeasureCard
              key={control.symbolicName}
              control={control}
              trustZones={trustZones}
              onChangeStatus={(status) =>
                onChangeControlStatus(control.symbolicName, status)
              }
              onChangePriority={(priority) =>
                onChangeControlPriority(control.symbolicName, priority)
              }
            />
          ))}

          {linkedControls.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No controls linked to this threat
            </p>
          )}
        </div>
      </ScrollArea>

      {onAddControl && selectedThreat && (
        <AddControlDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          currentThreatSymbolicName={selectedThreat.symbolicName}
          allThreats={allThreats}
          onSubmit={onAddControl}
        />
      )}
    </div>
  )
}
