import { FileText, Clock, Eye, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardStats } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats
  isLoading?: boolean
}

const statItems = [
  {
    key: 'total' as const,
    title: 'Total Models',
    icon: FileText,
    className: 'text-blue-600',
  },
  {
    key: 'inProgress' as const,
    title: 'In Progress',
    icon: Clock,
    className: 'text-yellow-600',
  },
  {
    key: 'pendingReview' as const,
    title: 'Pending Review',
    icon: Eye,
    className: 'text-orange-600',
  },
  {
    key: 'approved' as const,
    title: 'Approved',
    icon: CheckCircle,
    className: 'text-green-600',
  },
]

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className={`h-4 w-4 ${item.className}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <span className="animate-pulse bg-muted rounded w-8 h-8 inline-block" />
              ) : (
                stats[item.key]
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
