import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ControlStatus, Priority } from "@/types/tmbom"
import type { AddControlPayload } from "@/hooks/useWorkspaceState"
import type { ThreatInstanceUI } from "@/types/workspace"

const CONTROL_STATUSES: { value: ControlStatus; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "assumed", label: "Assumed" },
  { value: "retired", label: "Retired" },
  { value: "wont_do", label: "Won't Do" },
]

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

interface AddControlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentThreatSymbolicName: string
  allThreats: ThreatInstanceUI[]
  onSubmit: (payload: AddControlPayload) => void
}

export function AddControlDialog({
  open,
  onOpenChange,
  currentThreatSymbolicName,
  allThreats,
  onSubmit,
}: AddControlDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [linkedThreats, setLinkedThreats] = useState<Set<string>>(
    new Set([currentThreatSymbolicName])
  )
  const [status, setStatus] = useState<ControlStatus>("suggested")
  const [priority, setPriority] = useState<Priority>("medium")

  function resetForm() {
    setTitle("")
    setDescription("")
    setLinkedThreats(new Set([currentThreatSymbolicName]))
    setStatus("suggested")
    setPriority("medium")
  }

  // Re-sync when the current threat changes while dialog reopens
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setLinkedThreats(new Set([currentThreatSymbolicName]))
    } else {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  function handleThreatToggle(symbolicName: string, checked: boolean) {
    setLinkedThreats((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(symbolicName)
      } else {
        next.delete(symbolicName)
      }
      return next
    })
  }

  const isValid =
    title.trim() !== "" &&
    description.trim() !== "" &&
    linkedThreats.size > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      threats: Array.from(linkedThreats),
      status,
      priority,
    })
    resetForm()
    onOpenChange(false)
  }

  // Only show threats for the same component as the current threat, deduplicated
  const componentThreats = useMemo(() => {
    const currentThreat = allThreats.find(
      (t) => t.symbolicName === currentThreatSymbolicName
    )
    if (!currentThreat) return []
    const componentId = currentThreat.componentAffected
    const seen = new Set<string>()
    return allThreats.filter((t) => {
      if (t.dismissed || t.componentAffected !== componentId || seen.has(t.symbolicName))
        return false
      seen.add(t.symbolicName)
      return true
    })
  }, [allThreats, currentThreatSymbolicName])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Control</DialogTitle>
            <DialogDescription>
              Add a countermeasure linked to one or more threats.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="control-title">Title</Label>
              <Input
                id="control-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Input validation on search endpoint"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="control-description">Description</Label>
              <Textarea
                id="control-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the countermeasure..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Linked Threats (at least 1)</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                <div className="space-y-2">
                  {componentThreats.map((threat) => (
                    <div
                      key={threat.symbolicName}
                      className="flex items-start gap-2"
                    >
                      <Checkbox
                        id={`threat-link-${threat.symbolicName}`}
                        checked={linkedThreats.has(threat.symbolicName)}
                        onCheckedChange={(checked) =>
                          handleThreatToggle(
                            threat.symbolicName,
                            checked === true
                          )
                        }
                      />
                      <Label
                        htmlFor={`threat-link-${threat.symbolicName}`}
                        className="text-xs font-normal leading-tight"
                      >
                        {threat.title}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="control-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as ControlStatus)}
                >
                  <SelectTrigger className="w-full" id="control-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTROL_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="control-priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as Priority)}
                >
                  <SelectTrigger className="w-full" id="control-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Add Control
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
