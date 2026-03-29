import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function WaiverReasonInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium text-muted-foreground">
        Provide a reason for waiving this countermeasure:
      </div>
      <Textarea
        placeholder="e.g., Risk accepted by security team due to compensating controls..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-[80px] text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8 flex-1"
          disabled={!reason.trim()}
          onClick={() => onSubmit(reason.trim())}
        >
          Waive with Reason
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
