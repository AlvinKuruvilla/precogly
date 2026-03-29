import { Card, CardContent } from '@/components/ui/card'
import type { ReportThreatAnalysis } from '@/features/reports/types/report'
import { ReportSection } from '../ReportSection'

interface StrideSummaryProps {
  threatAnalysis: ReportThreatAnalysis
}

const STRIDE_LABELS: Record<string, string> = {
  spoofing: 'Spoofing',
  tampering: 'Tampering',
  repudiation: 'Repudiation',
  'information-disclosure': 'Information Disclosure',
  'denial-of-service': 'Denial of Service',
  'elevation-of-privilege': 'Elevation of Privilege',
  unknown: 'Other',
}

const STRIDE_COLORS: Record<string, string> = {
  spoofing: 'border-l-purple-500',
  tampering: 'border-l-orange-500',
  repudiation: 'border-l-yellow-500',
  'information-disclosure': 'border-l-blue-500',
  'denial-of-service': 'border-l-red-500',
  'elevation-of-privilege': 'border-l-pink-500',
  unknown: 'border-l-gray-500',
}

export function StrideSummary({ threatAnalysis }: StrideSummaryProps) {
  const { strideSummary } = threatAnalysis
  const totalThreats = Object.values(strideSummary).reduce((sum, count) => sum + count, 0)

  if (totalThreats === 0) {
    return (
      <ReportSection title="STRIDE Summary">
        <p className="text-sm text-muted-foreground">No threats identified.</p>
      </ReportSection>
    )
  }

  return (
    <ReportSection title="STRIDE Summary">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(STRIDE_LABELS).map(([key, label]) => {
          const count = strideSummary[key] || 0
          if (count === 0) return null
          return (
            <Card key={key} className={`border-l-4 ${STRIDE_COLORS[key] || ''}`}>
              <CardContent className="pt-3 pb-3">
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="mt-3 text-sm text-muted-foreground">
        Total: {totalThreats} active threats across {Object.keys(strideSummary).length} categories
      </div>
    </ReportSection>
  )
}
