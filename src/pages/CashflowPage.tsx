import { CashflowSummary } from '@/components/cashflow/CashflowSummary'
import { CashflowTimeline } from '@/components/cashflow/CashflowTimeline'
import { CashflowChart } from '@/components/cashflow/CashflowChart'
import { useCashflow } from '@/hooks/useCashflow'

export function CashflowPage() {
  const { data: events, isLoading, error } = useCashflow(90)

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>
  if (error) return <p className="text-destructive">Error: {error.message}</p>

  const items = events ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cashflow — 90 days</h1>
      <CashflowSummary events={items} />
      <CashflowChart events={items} />
      <CashflowTimeline events={items} />
    </div>
  )
}
