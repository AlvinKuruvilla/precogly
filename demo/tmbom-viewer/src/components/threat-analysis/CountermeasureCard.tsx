import { ArrowRight } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { ControlStatus, Priority } from "@/types/tmbom"
import type { ControlUI, TrustZoneUI } from "@/types/workspace"

interface CountermeasureCardProps {
  control: ControlUI
  trustZones: TrustZoneUI[]
  onChangeStatus: (status: ControlStatus) => void
  onChangePriority: (priority: Priority) => void
}

const CONTROL_STATUSES: { value: ControlStatus; label: string; color: string }[] = [
  { value: "suggested", label: "Suggested", color: "bg-red-500" },
  { value: "under_review", label: "Under Review", color: "bg-amber-500" },
  { value: "approved", label: "Approved", color: "bg-amber-500" },
  { value: "scheduled", label: "Scheduled", color: "bg-amber-500" },
  { value: "active", label: "Active", color: "bg-green-500" },
  { value: "assumed", label: "Assumed", color: "bg-green-500" },
  { value: "retired", label: "Retired", color: "bg-gray-400" },
  { value: "wont_do", label: "Won't Do", color: "bg-gray-400" },
]

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

function getStatusDotColor(status: ControlStatus): string {
  const found = CONTROL_STATUSES.find((s) => s.value === status)
  return found?.color ?? "bg-gray-400"
}

export function CountermeasureCard({
  control,
  trustZones,
  onChangeStatus,
  onChangePriority,
}: CountermeasureCardProps) {
  const zoneNameMap = new Map(
    trustZones.map((tz) => [tz.symbolicName, tz.title])
  )

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
            getStatusDotColor(control.status)
          )}
        />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium">{control.title}</h4>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {control.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
            Status
          </label>
          <Select
            value={control.status}
            onValueChange={(value) =>
              onChangeStatus(value as ControlStatus)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    getStatusDotColor(control.status)
                  )}
                />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {CONTROL_STATUSES.map((statusOption) => (
                <SelectItem
                  key={statusOption.value}
                  value={statusOption.value}
                  className="text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        statusOption.color
                      )}
                    />
                    {statusOption.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
            Priority
          </label>
          <Select
            value={control.priority}
            onValueChange={(value) =>
              onChangePriority(value as Priority)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((priorityOption) => (
                <SelectItem
                  key={priorityOption.value}
                  value={priorityOption.value}
                  className="text-xs"
                >
                  {priorityOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {control.trustBoundary && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Boundary:</span>
          <span className="font-medium">
            {zoneNameMap.get(control.trustBoundary.trustZoneA) ??
              control.trustBoundary.trustZoneA}
          </span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium">
            {zoneNameMap.get(control.trustBoundary.trustZoneB) ??
              control.trustBoundary.trustZoneB}
          </span>
        </div>
      )}
    </div>
  )
}
