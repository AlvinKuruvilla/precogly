/**
 * What an AI feature shows when the call fails.
 *
 * The status codes carry distinct, actionable meanings and are worth separating
 * rather than collapsing into one "something went wrong":
 *
 * ```text
 *   400   configured -> unconfigured between the availability check and the
 *         request. Nothing to retry; the user needs to set up a provider.
 *   503   configured but unreachable. Retrying is exactly right once they have
 *         started the model or fixed the URL.
 *   else  unknown. Offer the retry and say plainly what was being attempted.
 *   ```
 *
 * Provider setup is routed to internally, so a caller only has to say what it
 * was doing and how to try again.
 */

import { useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { AI_PROVIDER_SETTINGS_PATH } from '../constants'

interface AiErrorStateProps {
  error: unknown
  /**
   * What failed, in the user's terms — shown verbatim for any status other than
   * the two handled specially. "Something went wrong ranking these threats."
   */
  fallbackMessage: string
  onRetry: () => void
}

export function AiErrorState({ error, fallbackMessage, onRetry }: AiErrorStateProps) {
  const navigate = useNavigate()
  const status = error instanceof ApiError ? error.status : undefined

  if (status === 400) {
    return (
      <div className="space-y-2 p-4 py-10 text-center text-sm">
        <p className="text-muted-foreground">AI isn’t configured for this organization.</p>
        <Button size="sm" variant="outline" onClick={() => navigate(AI_PROVIDER_SETTINGS_PATH)}>
          Set up a provider
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-4 py-10 text-center text-sm">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        {status === 503
          ? 'The AI model is unreachable. Start it, or check the provider URL.'
          : fallbackMessage}
      </div>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  )
}
