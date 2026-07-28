/**
 * A button that turns an AI-backed view on and off, wearing the owl.
 *
 * The badge is not decoration and not a house-style flourish. Clicking one of
 * these sends data to whatever provider the organization configured and spends
 * tokens that land in that organization's usage report, so the control has to
 * look different from a local sort or filter sitting next to it. An unbadged
 * "sort by relevance" would hide a third-party call behind something that reads
 * like column sorting, which is the wrong default in a security tool.
 *
 * Three states, decided by the caller, so a click is never a surprise:
 *
 * ```text
 *   unavailable   no provider configured -> muted owl, click routes to setup
 *   blocked       usable, but not here   -> muted owl, tooltip says why, inert
 *   ready         click toggles the view -> owl fills in while active
 * ```
 *
 * `unavailable` routes to provider settings itself rather than taking a
 * callback, so a caller never has to know what configuring AI involves.
 *
 * The button is deliberately never given the `disabled` attribute: a disabled
 * button swallows pointer events, and the tooltip explaining *why* it is dead
 * goes with them. Blocked states stay clickable and simply do nothing.
 */

import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AI_PROVIDER_SETTINGS_PATH } from '../constants'
import { OwlMark } from './OwlMark'

interface OwlToggleProps {
  /** Text beside the owl. Name the action, not the technology — "Rank", not "AI". */
  label: string
  /** Tooltip when the control is usable. */
  tooltip: string
  active: boolean
  onChange: (next: boolean) => void
  /** An in-flight AI call; swaps the owl for a spinner. */
  pending?: boolean
  /** No AI provider configured for this organization. Click routes to setup. */
  unavailable?: boolean
  /**
   * Usable in general but not in the caller's current state. The string is the
   * tooltip, and is the only explanation the user gets — make it say what would
   * have to change, not that something is wrong.
   */
  blockedReason?: string | null
}

export function OwlToggle({
  label,
  tooltip,
  active,
  onChange,
  pending = false,
  unavailable = false,
  blockedReason = null,
}: OwlToggleProps) {
  const navigate = useNavigate()
  const inert = unavailable || blockedReason !== null

  const handleClick = () => {
    if (unavailable) return navigate(AI_PROVIDER_SETTINGS_PATH)
    if (blockedReason !== null) return
    onChange(!active)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={active}
          className={cn('h-7 gap-1.5 px-2 text-xs', inert && 'text-muted-foreground')}
          onClick={handleClick}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <OwlMark className="h-4 w-4" />
          )}
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {unavailable
          ? 'Set up an AI provider to use this'
          : blockedReason ?? tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
