import { Upload, Shield } from "lucide-react"
import { useCallback, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  onFileSelected: (file: File) => void
}

export function EmptyState({ onFileSelected }: EmptyStateProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    },
    []
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith(".json")) {
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-6 p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Import a TM-BOM File
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a TM-BOM compliant JSON file to populate the threat
              analysis workspace
            </p>
          </div>

          <div
            className={cn(
              "flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Drag & drop your JSON file here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            Select File
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
