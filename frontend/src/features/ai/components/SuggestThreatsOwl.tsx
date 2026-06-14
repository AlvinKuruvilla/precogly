/**
 * The owl that offers AI threat suggestions for the selected component.
 *
 * This is the first concrete use of the owl-as-AI-affordance convention: one
 * glyph, behaviour local to where it sits. Here it lives in the component
 * view's "Threats" header and, when clicked, opens a popover of ranked,
 * grounded suggestions the user reviews and accepts one by one.
 *
 * Three states, decided up front so the click is honest:
 *  - AI off for this org  -> muted owl, tooltip + click route to provider setup.
 *  - AI on                -> active owl, click opens the suggestions popover.
 *  - selection isn't a component (a data flow, nothing selected) -> no owl.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, RefreshCw, AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { SEVERITY_COLORS } from '@/features/dfd-editor/components/threat-analysis/severity-utils'
import { useCreateComponentThreat } from '@/features/threat-models/api/threats'
import {
  useAiAvailability,
  useSuggestThreats,
  type ThreatSuggestion,
} from '@/features/ai/api/suggest'
import { OwlMark } from './OwlMark'

const AI_PROVIDER_SETTINGS_PATH = '/settings/ai-providers'

interface SuggestThreatsOwlProps {
  /** Backend component id, or null when the selection is not a component. */
  componentId: number | null
}

export function SuggestThreatsOwl({ componentId }: SuggestThreatsOwlProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // threatLibrary ids the user has accepted this session. Accepted suggestions
  // drop out of the list immediately so what's left is always "still to review"
  // — no manual regenerate needed. This component is keyed by component id by
  // its parent, so the set resets when the user moves to another component.
  const [accepted, setAccepted] = useState<ReadonlySet<number>>(() => new Set())
  const availability = useAiAvailability(componentId)
  const suggest = useSuggestThreats()

  // No component selected -> nothing to suggest against, so no owl at all.
  if (componentId === null) return null

  // AI is configured-off for this org. Keep the owl visible (it teaches that
  // the feature exists) but lead the user to set up a provider rather than
  // failing on click.
  if (availability.data && !availability.data.available) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => navigate(AI_PROVIDER_SETTINGS_PATH)}
              aria-label="Set up an AI provider to suggest threats"
            >
              <OwlMark className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Set up an AI provider to suggest threats</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Fetch on open (and only then) so we never spend an LLM call until asked.
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next && !suggest.data && !suggest.isPending) {
      suggest.mutate(componentId)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                aria-label="Suggest threats with AI"
              >
                <OwlMark className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Suggest threats with AI</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-start justify-between gap-2 border-b px-3 py-2">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <OwlMark className="h-4 w-4" />
              AI threat suggestions
            </div>
            <p className="text-[11px] text-muted-foreground">
              Grounded in your installed packs · review before adding
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={suggest.isPending}
            onClick={() => suggest.mutate(componentId)}
            aria-label="Regenerate suggestions"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', suggest.isPending && 'animate-spin')} />
          </Button>
        </div>

        <SuggestionBody
          componentId={componentId}
          isPending={suggest.isPending}
          error={suggest.error}
          suggestions={suggest.data?.suggestions}
          accepted={accepted}
          onAccepted={(threatLibrary) =>
            setAccepted((prev) => new Set(prev).add(threatLibrary))
          }
          onRetry={() => suggest.mutate(componentId)}
          onConfigure={() => navigate(AI_PROVIDER_SETTINGS_PATH)}
        />
      </PopoverContent>
    </Popover>
  )
}

interface SuggestionBodyProps {
  componentId: number
  isPending: boolean
  error: unknown
  suggestions: ThreatSuggestion[] | undefined
  accepted: ReadonlySet<number>
  onAccepted: (threatLibrary: number) => void
  onRetry: () => void
  onConfigure: () => void
}

function SuggestionBody({
  componentId,
  isPending,
  error,
  suggestions,
  accepted,
  onAccepted,
  onRetry,
  onConfigure,
}: SuggestionBodyProps) {
  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ranking relevant threats…
      </div>
    )
  }

  if (error) {
    return <SuggestionError error={error} onRetry={onRetry} onConfigure={onConfigure} />
  }

  if (!suggestions) return null

  if (suggestions.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-muted-foreground">
        No additional threats to suggest for this component.
      </div>
    )
  }

  // Hide what's already been accepted so the list is always the remaining work.
  const remaining = suggestions.filter((s) => !accepted.has(s.threatLibrary))

  if (remaining.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-muted-foreground">
        All suggestions added. Regenerate to look for more.
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-80">
      <ul className="divide-y">
        {remaining.map((suggestion) => (
          <SuggestionRow
            key={suggestion.threatLibrary}
            componentId={componentId}
            suggestion={suggestion}
            onAccepted={onAccepted}
          />
        ))}
      </ul>
    </ScrollArea>
  )
}

/**
 * The error message is tuned to what the user can actually do: a 503 means the
 * model is enabled but unreachable (start it / fix the URL); a 400 means it
 * became unconfigured between availability check and request (route to setup);
 * anything else is generic with a retry.
 */
function SuggestionError({
  error,
  onRetry,
  onConfigure,
}: {
  error: unknown
  onRetry: () => void
  onConfigure: () => void
}) {
  const status = error instanceof ApiError ? error.status : undefined

  if (status === 400) {
    return (
      <div className="space-y-2 px-3 py-6 text-center text-sm">
        <p className="text-muted-foreground">AI isn’t configured for this organization.</p>
        <Button size="sm" variant="outline" onClick={onConfigure}>
          Set up a provider
        </Button>
      </div>
    )
  }

  const message =
    status === 503
      ? 'The AI model is unreachable. Start it, or check the provider URL.'
      : 'Something went wrong fetching suggestions.'

  return (
    <div className="space-y-2 px-3 py-6 text-center text-sm">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        {message}
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function SuggestionRow({
  componentId,
  suggestion,
  onAccepted,
}: {
  componentId: number
  suggestion: ThreatSuggestion
  onAccepted: (threatLibrary: number) => void
}) {
  const createThreat = useCreateComponentThreat()

  // Accept = persist the candidate through the same create path the manual
  // "Add Custom Threat" dialog uses, carrying the model's suggested severity.
  // On success the parent drops this suggestion from the list, so the row
  // simply disappears — no local "added" state to track.
  const handleAccept = () => {
    createThreat.mutate(
      {
        component: componentId,
        threatLibrary: suggestion.threatLibrary,
        inherentSeverity: suggestion.suggestedSeverity,
      },
      {
        onSuccess: () => {
          toast.success(`Added “${suggestion.threatName}”`)
          onAccepted(suggestion.threatLibrary)
        },
        onError: () => toast.error('Could not add threat'),
      }
    )
  }

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{suggestion.threatName}</span>
            <Badge
              variant="outline"
              className={cn('shrink-0 text-[10px]', SEVERITY_COLORS[suggestion.suggestedSeverity])}
            >
              {suggestion.suggestedSeverity}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.rationale}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 gap-1 text-xs"
          disabled={createThreat.isPending}
          onClick={handleAccept}
        >
          {createThreat.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Plus className="h-3 w-3" />
              Accept
            </>
          )}
        </Button>
      </div>
    </li>
  )
}
