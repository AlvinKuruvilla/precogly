import { ArrowLeft, Upload, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import type { ScopeUI } from "@/types/workspace"

interface WorkspaceHeaderProps {
  scope: ScopeUI
  version: string
  description: string
  frozen: boolean
  reviewedAt: string | null
  repoLink: string | null
  releaseDocsLink: string | null
  onBack: () => void
  onImport: () => void
  onExport: () => void
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function WorkspaceHeader({
  scope,
  version,
  description,
  frozen,
  reviewedAt,
  repoLink,
  releaseDocsLink,
  onBack,
  onImport,
  onExport,
}: WorkspaceHeaderProps) {
  return (
    <div className="border-b bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <div>
            <div className="flex items-center gap-2">
              {scope.description ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1 className="cursor-help text-sm font-semibold underline decoration-dotted underline-offset-4">
                      {scope.title}
                    </h1>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    {scope.description}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <h1 className="text-sm font-semibold">{scope.title}</h1>
              )}
              <span className="text-xs text-muted-foreground">/ Workspace</span>
              <Badge variant="outline" className="text-xs">
                v{version}
              </Badge>
              {frozen ? (
                <Badge
                  variant="secondary"
                  className="border-gray-200 bg-gray-100 text-xs text-gray-700"
                >
                  Frozen
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="border-amber-200 bg-amber-100 text-xs text-amber-700"
                >
                  Draft
                </Badge>
              )}
              {reviewedAt && (
                <span className="text-xs text-muted-foreground">
                  Reviewed: {reviewedAt}
                </span>
              )}
              {repoLink && (
                <a
                  href={repoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {releaseDocsLink && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={releaseDocsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Release docs</TooltipContent>
                </Tooltip>
              )}
            </div>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onImport}>
            <Upload className="mr-1 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t px-4 py-2">
        <Badge variant="outline" className="text-xs">
          {formatLabel(scope.businessCriticality)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {formatLabel(scope.exposure)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {formatLabel(scope.tier)}
        </Badge>
        {scope.dataSensitivity.map((ds) => (
          <Badge key={ds} variant="secondary" className="text-xs uppercase">
            {ds}
          </Badge>
        ))}
      </div>
    </div>
  )
}
