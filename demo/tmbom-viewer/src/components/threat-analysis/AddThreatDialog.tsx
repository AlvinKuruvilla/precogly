import { useState } from "react"
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
import type { ThreatSource } from "@/types/tmbom"
import type { AddThreatPayload } from "@/hooks/useWorkspaceState"
import type { ThreatPersonaUI } from "@/types/workspace"

const THREAT_SOURCES: { value: ThreatSource; label: string }[] = [
  { value: "adversary", label: "Adversary" },
  { value: "human_error", label: "Human Error" },
  { value: "failure", label: "Failure" },
  { value: "events_beyond_org_control", label: "Events Beyond Org Control" },
]

interface AddThreatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  componentAffected: string
  threatPersonas: ThreatPersonaUI[]
  onSubmit: (payload: AddThreatPayload) => void
}

export function AddThreatDialog({
  open,
  onOpenChange,
  componentAffected,
  threatPersonas,
  onSubmit,
}: AddThreatDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [threatPersona, setThreatPersona] = useState("none")
  const [event, setEvent] = useState("")
  const [selectedSources, setSelectedSources] = useState<Set<ThreatSource>>(
    new Set()
  )

  function resetForm() {
    setTitle("")
    setDescription("")
    setThreatPersona("none")
    setEvent("")
    setSelectedSources(new Set())
  }

  function handleSourceToggle(source: ThreatSource, checked: boolean) {
    setSelectedSources((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(source)
      } else {
        next.delete(source)
      }
      return next
    })
  }

  const isValid =
    title.trim() !== "" &&
    description.trim() !== "" &&
    event.trim() !== "" &&
    selectedSources.size > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      componentAffected,
      threatPersona: threatPersona === "none" ? "" : threatPersona,
      event: event.trim(),
      sources: Array.from(selectedSources),
    })
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Threat</DialogTitle>
            <DialogDescription>
              Add a custom threat to this component.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="threat-title">Title</Label>
              <Input
                id="threat-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SQL injection via search input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threat-description">Description</Label>
              <Textarea
                id="threat-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the threat scenario..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threat-persona">Threat Persona</Label>
              <Select value={threatPersona} onValueChange={setThreatPersona}>
                <SelectTrigger className="w-full" id="threat-persona">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {threatPersonas.map((persona) => (
                    <SelectItem
                      key={persona.symbolicName}
                      value={persona.symbolicName}
                    >
                      {persona.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threat-event">Event</Label>
              <Input
                id="threat-event"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="e.g. Attacker submits malicious query"
              />
            </div>

            <div className="space-y-2">
              <Label>Sources (at least 1)</Label>
              <div className="space-y-2">
                {THREAT_SOURCES.map((source) => (
                  <div key={source.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`source-${source.value}`}
                      checked={selectedSources.has(source.value)}
                      onCheckedChange={(checked) =>
                        handleSourceToggle(source.value, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`source-${source.value}`}
                      className="font-normal"
                    >
                      {source.label}
                    </Label>
                  </div>
                ))}
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
              Add Threat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
