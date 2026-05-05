import { useState, useEffect } from 'react'
import { Info, X, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useComplianceDrift, useRefreshCompliance } from '@/features/compliance/api/compliance'

interface ComplianceDriftBannerProps {
  threatModelId: string
}

export function ComplianceDriftBanner({ threatModelId }: ComplianceDriftBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const { data: driftData, dataUpdatedAt } = useComplianceDrift(threatModelId)
  const refreshMutation = useRefreshCompliance()

  // Reset dismissed state when drift data changes
  useEffect(() => {
    setIsDismissed(false)
  }, [dataUpdatedAt])

  if (!driftData?.hasDrift || isDismissed) {
    return null
  }

  const totalChanges = driftData.totalAdditions + driftData.totalRemovals + driftData.totalUpdates

  const handleRefresh = () => {
    refreshMutation.mutate(threatModelId, {
      onSuccess: (result) => {
        toast.success(
          `Compliance mappings updated: ${result.standardsAdded} added, ${result.standardsRemoved} removed, ${result.standardsUpdated} updated across ${result.countermeasuresAffected} countermeasures.`
        )
      },
      onError: () => {
        toast.error('Failed to refresh compliance mappings. Please try again.')
      },
    })
  }

  return (
    <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">Compliance Mappings Out of Date</p>
        <p className="text-blue-700 dark:text-blue-300 mt-0.5">
          {totalChanges} change{totalChanges !== 1 ? 's' : ''} detected across {driftData.affectedCountermeasures} countermeasure{driftData.affectedCountermeasures !== 1 ? 's' : ''}.
          Library pack updates are available.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
        onClick={handleRefresh}
        disabled={refreshMutation.isPending}
      >
        {refreshMutation.isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        )}
        Refresh
      </Button>
      <button
        className="shrink-0 mt-0.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        onClick={() => setIsDismissed(true)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
