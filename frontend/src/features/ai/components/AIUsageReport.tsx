/**
 * AI Usage report — "your org spent $X on AI" for one organization.
 *
 * A read-only view over `GET /ai-usage/summary/`: three KPI cards, a 12-month
 * usage trend, and breakdowns by feature, model, and user. Charts are
 * dependency-free CSS bars (the data is simple; no charting library is pulled
 * in). Self-hosted usage has no dollar cost, so cost renders as "—" wherever a
 * group is entirely unpriced — distinct from a real $0.
 */

import { useState } from 'react'
import { DollarSign, Coins, Gauge } from 'lucide-react'
import { useAIUsageSummary } from '@/features/ai/api/usage'
import type {
  AIUsageSummary,
  TrendPoint,
  UsageWindow,
} from '@/features/ai/types/usage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const WINDOW_OPTIONS: { value: UsageWindow; label: string }[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'all_time', label: 'All time' },
]

// Compact for headline/table figures ("2.16M"); full grouping reads as false
// precision on six-figure token counts.
const compactTokens = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatCost(cost: number | null): string {
  // A null sum means the whole group was self-hosted (unpriced), not free.
  return cost === null ? '—' : usd.format(cost)
}

// Hover tooltips want the exact figure, not the compact headline form: the
// point of hovering a bar is to read the real count, and sub-cent per-month
// costs would round away at the default two decimals.
const exactTokens = new Intl.NumberFormat('en-US')
const preciseUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

function exactCost(cost: number | null): string {
  return cost === null ? '—' : preciseUsd.format(cost)
}

// Feature labels are slugs on the wire ("suggest_threats"); title-case them for
// display, with room to special-case names that don't prettify cleanly.
function formatFeature(feature: string): string {
  return feature
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function AIUsageReport({ organizationId }: { organizationId: number }) {
  const [window, setWindow] = useState<UsageWindow>('this_month')
  const { data, isLoading, isError } = useAIUsageSummary(organizationId, window)
  const windowLabel = WINDOW_OPTIONS.find((o) => o.value === window)!.label

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Usage</h2>
          <p className="text-sm text-muted-foreground">
            Token usage and cost across this organization's AI features.
          </p>
        </div>
        <Select value={window} onValueChange={(v) => setWindow(v as UsageWindow)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Could not load AI usage. Please try again.
          </CardContent>
        </Card>
      ) : (
        <UsageContent
          data={data}
          isLoading={isLoading}
          windowLabel={windowLabel}
        />
      )}
    </div>
  )
}

function UsageContent({
  data,
  isLoading,
  windowLabel,
}: {
  data?: AIUsageSummary
  isLoading: boolean
  windowLabel: string
}) {
  // Loading and empty both resolve after the KPI row so the layout doesn't jump.
  const isEmpty = !isLoading && data && data.totals.calls === 0

  return (
    <>
      <KpiCards data={data} isLoading={isLoading} windowLabel={windowLabel} />

      {isEmpty ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No AI usage yet this period.
          </CardContent>
        </Card>
      ) : (
        data && (
          <>
            <TrendChart trend={data.trend} />
            <div className="grid gap-4 md:grid-cols-2">
              <FeatureBreakdown data={data} />
              <UserBreakdown data={data} />
              <ModelBreakdown data={data} />
            </div>
          </>
        )
      )}
    </>
  )
}

function KpiCards({
  data,
  isLoading,
  windowLabel,
}: {
  data?: AIUsageSummary
  isLoading: boolean
  windowLabel: string
}) {
  const totals = data?.totals
  const cards = [
    {
      title: 'Total cost',
      icon: DollarSign,
      iconClass: 'text-green-600',
      value: totals ? formatCost(totals.cost) : '—',
      subtitle: 'managed providers only',
    },
    {
      title: 'Total tokens',
      icon: Coins,
      iconClass: 'text-blue-600',
      value: totals ? compactTokens.format(totals.tokens) : '0',
      subtitle: windowLabel.toLowerCase(),
    },
    {
      title: 'Avg tokens / call',
      icon: Gauge,
      iconClass: 'text-purple-600',
      value: totals ? totals.avgTokensPerCall.toLocaleString() : '0',
      subtitle: totals ? `${totals.calls.toLocaleString()} calls` : '0 calls',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.iconClass}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <span className="animate-pulse bg-muted rounded w-16 h-8 inline-block" />
            ) : (
              <>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Fill twelve month buckets back from the current month so the axis is stable
// even for orgs with sparse usage; the endpoint only returns months that have
// records, so gaps are merged in as zeros here.
function buildTrendBuckets(trend: TrendPoint[]) {
  const byMonth = new Map(trend.map((point) => [point.month.slice(0, 7), point]))
  const now = new Date()
  const buckets = []
  for (let offset = 11; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const point = byMonth.get(key)
    buckets.push({
      key,
      label: d.toLocaleString('en-US', { month: 'short' }),
      tokens: point?.tokens ?? 0,
      cost: point?.cost ?? null,
    })
  }
  return buckets
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  // Cost only means anything once a managed (priced) adapter has been used;
  // until then the toggle would just draw an empty chart, so hide it.
  const hasCost = trend.some((point) => point.cost !== null)
  const [metric, setMetric] = useState<'tokens' | 'cost'>('tokens')
  const active = hasCost ? metric : 'tokens'

  const buckets = buildTrendBuckets(trend)
  const values = buckets.map((b) => (active === 'tokens' ? b.tokens : b.cost ?? 0))
  const max = Math.max(...values, 1)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Usage over time</CardTitle>
        {hasCost && (
          <div className="flex gap-1">
            <Button
              variant={active === 'tokens' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setMetric('tokens')}
            >
              Tokens
            </Button>
            <Button
              variant={active === 'cost' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setMetric('cost')}
            >
              Cost
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          {buckets.map((bucket, i) => {
            const value = values[i]
            // Give any non-zero month a visible sliver so it never disappears.
            const heightPct = value > 0 ? Math.max((value / max) * 100, 3) : 0
            // In the cost view a month can have real usage but no dollar cost
            // (all self-hosted / unpriced). Draw those as a faint stub so the
            // column reads as "activity, but $0" rather than "nothing happened"
            // — a blank column is otherwise indistinguishable from an idle month.
            const isUnpricedActivity = value === 0 && bucket.tokens > 0
            const exact =
              active === 'tokens'
                ? `${exactTokens.format(bucket.tokens)} tokens`
                : exactCost(bucket.cost)
            return (
              <div
                key={bucket.key}
                className="group relative flex flex-1 flex-col items-center gap-2"
              >
                {/* Exact figure on hover — the bars alone only convey relative
                    size, so this is where the real number lives. */}
                <div className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block">
                  <div className="font-medium">{bucket.label}</div>
                  <div className="text-muted-foreground">{exact}</div>
                </div>
                <div className="flex h-40 w-full items-end">
                  {isUnpricedActivity ? (
                    <div className="mx-auto h-1 w-full max-w-[28px] rounded-t bg-muted-foreground/25 transition-all group-hover:bg-muted-foreground/40" />
                  ) : (
                    <div
                      className="mx-auto w-full max-w-[28px] rounded-t bg-primary transition-all group-hover:bg-primary/80"
                      style={{ height: `${heightPct}%` }}
                    />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{bucket.label}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// The three breakdowns share a card + table shell; only the rows differ.
function BreakdownCard({
  title,
  columns,
  children,
}: {
  title: string
  columns: string[]
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={col} className={i === 0 ? '' : 'text-right'}>
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function FeatureBreakdown({ data }: { data: AIUsageSummary }) {
  return (
    <BreakdownCard title="By feature" columns={['Feature', 'Tokens', 'Cost']}>
      {data.byFeature.map((row) => (
        <TableRow key={row.feature}>
          <TableCell className="font-medium">{formatFeature(row.feature)}</TableCell>
          <TableCell className="text-right text-muted-foreground">
            {compactTokens.format(row.tokens)}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {formatCost(row.cost)}
          </TableCell>
        </TableRow>
      ))}
    </BreakdownCard>
  )
}

function UserBreakdown({ data }: { data: AIUsageSummary }) {
  return (
    <BreakdownCard title="By user" columns={['User', 'Tokens', 'Cost']}>
      {data.byUser.map((row, i) => (
        <TableRow key={row.userId ?? `deleted-${i}`}>
          <TableCell className="font-medium max-w-[180px] truncate">
            {row.email ?? 'Deleted user'}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {compactTokens.format(row.tokens)}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {formatCost(row.cost)}
          </TableCell>
        </TableRow>
      ))}
    </BreakdownCard>
  )
}

function ModelBreakdown({ data }: { data: AIUsageSummary }) {
  return (
    <BreakdownCard title="By model / provider" columns={['Model', 'Tokens', 'Cost']}>
      {data.byModel.map((row) => (
        <TableRow key={`${row.providerType}:${row.model}`}>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              <span className="truncate max-w-[160px]">{row.model}</span>
              {/* No dollar cost is our only signal that a provider is
                  self-hosted; managed adapters ship a price book. */}
              <Badge className="bg-gray-100 text-gray-800 font-normal">
                {row.cost === null ? 'self-hosted' : 'managed'}
              </Badge>
            </div>
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {compactTokens.format(row.tokens)}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {formatCost(row.cost)}
          </TableCell>
        </TableRow>
      ))}
    </BreakdownCard>
  )
}
