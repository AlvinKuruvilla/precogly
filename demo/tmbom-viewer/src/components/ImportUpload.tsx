import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import type { TmBomPreviewStats } from "@/lib/tmbom-parser"

interface ImportUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  stats: TmBomPreviewStats | null
  validationErrors: string[]
  onImport: () => void
}

const STAT_LABELS: { key: keyof TmBomPreviewStats; label: string }[] = [
  { key: "trustZones", label: "Trust Zones" },
  { key: "trustBoundaries", label: "Trust Boundaries" },
  { key: "actors", label: "Actors" },
  { key: "components", label: "Components" },
  { key: "dataStores", label: "Data Stores" },
  { key: "dataFlows", label: "Data Flows" },
  { key: "threatPersonas", label: "Threat Personas" },
  { key: "threats", label: "Threats" },
  { key: "controls", label: "Controls" },
  { key: "risks", label: "Risks" },
  { key: "assumptions", label: "Assumptions" },
]

export function ImportUpload({
  open,
  onOpenChange,
  fileName,
  stats,
  validationErrors,
  onImport,
}: ImportUploadProps) {
  const isValid = validationErrors.length === 0 && stats !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import TM-BOM File</DialogTitle>
          <DialogDescription className="truncate">
            {fileName}
          </DialogDescription>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              Validation Errors
            </div>
            <ul className="list-inside list-disc text-xs text-destructive">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {stats && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Valid TM-BOM File
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STAT_LABELS.map(({ key, label }) => {
                const count = stats[key]
                if (count === 0) return null
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onImport} disabled={!isValid}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
