import { AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ValidationResult } from '@/features/libraries/types/packs'

export function ValidationWarningsDialog({
  validationResult,
  open,
  onOpenChange,
}: {
  validationResult: ValidationResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!validationResult) return null

  const hasErrors = validationResult.errorCount > 0
  const hasWarnings = validationResult.warningCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Validation Issues Found</DialogTitle>
          <DialogDescription>
            {validationResult.packName} v{validationResult.version}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {/* Errors */}
          {hasErrors && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-800">
                Errors ({validationResult.errorCount})
              </h4>
              {validationResult.errors.map((error, index) => (
                <div
                  key={index}
                  className="p-3 bg-red-50 border border-red-200 rounded-md"
                >
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="text-red-800 font-medium">{error.message}</p>
                      <p className="text-red-600 mt-1">
                        File: {error.file}
                        {error.reference && <> | Reference: {error.reference}</>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-amber-800">
                Warnings ({validationResult.warningCount})
              </h4>
              {validationResult.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-md"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="text-amber-800">{warning.message}</p>
                      <p className="text-amber-600 mt-1">
                        File: {warning.file} | Field: {warning.field}
                      </p>
                      <p className="text-amber-700 mt-1 font-medium">
                        Fix: {warning.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
