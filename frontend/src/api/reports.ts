import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ReportData } from '@/types/report'

export function useReport(threatModelId: string) {
  return useQuery({
    queryKey: ['report', threatModelId],
    queryFn: () => api.get<ReportData>(`/threat-models/${threatModelId}/report/`),
    enabled: !!threatModelId,
  })
}
