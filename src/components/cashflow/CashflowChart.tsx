import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDateShort } from '@/lib/formatters'
import type { CashflowEvent } from '@/lib/types'

interface CashflowChartProps {
  events: CashflowEvent[]
}

export function CashflowChart({ events }: CashflowChartProps) {
  // Build cumulative balance per day
  const dailyMap = new Map<string, number>()

  for (const e of events) {
    const delta = e.direction === 'IN' ? e.remaining : -e.remaining
    dailyMap.set(e.event_date, (dailyMap.get(e.event_date) ?? 0) + delta)
  }

  const sortedDates = [...dailyMap.keys()].sort()
  let cumulative = 0
  const chartData = sortedDates.map((date) => {
    cumulative += dailyMap.get(date)!
    return { date, balance: cumulative }
  })

  if (chartData.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Saldo krocząca</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDateShort} fontSize={12} />
            <YAxis tickFormatter={(v: number) => formatCurrency(v)} fontSize={12} width={100} />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), 'Saldo']}
              labelFormatter={(label) => formatDateShort(String(label))}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
