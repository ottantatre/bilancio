import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import type { CashflowEvent } from '@/lib/types'

interface CashflowSummaryProps {
  events: CashflowEvent[]
}

export function CashflowSummary({ events }: CashflowSummaryProps) {
  const totalIn = events
    .filter((e) => e.direction === 'IN')
    .reduce((sum, e) => sum + e.remaining, 0)

  const totalOut = events
    .filter((e) => e.direction === 'OUT')
    .reduce((sum, e) => sum + e.remaining, 0)

  const balance = totalIn - totalOut

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">+{formatCurrency(totalIn)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-600">-{formatCurrency(totalOut)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(balance)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
