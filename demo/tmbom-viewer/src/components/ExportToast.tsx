import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { WorkspaceState } from "@/types/workspace"

interface ExportToastProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: WorkspaceState
}

function generateExportPreview(state: WorkspaceState): string {
  const preview = {
    $schema:
      "https://github.com/OWASP/www-project-threat-model-library/blob/main/threat-model.schema.json",
    version: state.version,
    scope: {
      title: state.scope.title,
      description: state.scope.description,
      business_criticality: state.scope.businessCriticality,
      data_sensitivity: state.scope.dataSensitivity,
      exposure: state.scope.exposure,
      tier: state.scope.tier,
    },
    trust_zones: `[${state.trustZones.length} items]`,
    components: `[${state.components.filter((c) => c.category === "component").length} items]`,
    threats: `[${state.threats.length} instances]`,
    controls: `[${state.controls.length} items]`,
  }
  return JSON.stringify(preview, null, 2)
}

export function ExportToast({
  open,
  onOpenChange,
  state,
}: ExportToastProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Preview</DialogTitle>
          <DialogDescription>
            This is a demo preview. In the full app, this downloads a valid
            TM-BOM JSON file.
          </DialogDescription>
        </DialogHeader>

        <pre className="max-h-80 overflow-auto rounded-md border bg-muted p-4 text-xs">
          {generateExportPreview(state)}
        </pre>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
