import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDocuments } from '@/hooks/useDocuments'
import { useCashflow } from '@/hooks/useCashflow'
import { formatCurrency } from '@/lib/formatters'
import dayjs from 'dayjs'

export function DashboardPage() {
  const { data: allDocs } = useDocuments()
  const { data: cashflow } = useCashflow(90)

  const docs = allDocs ?? []
  const events = cashflow ?? []

  const overdue = docs.filter((d) => d.status === 'overdue')
  const upcoming = docs.filter(
    (d) =>
      d.status !== 'paid' &&
      d.status !== 'cancelled' &&
      dayjs(d.due_date).isBefore(dayjs().add(7, 'day')) &&
      dayjs(d.due_date).isAfter(dayjs().subtract(1, 'day')),
  )

  const totalIn = events
    .filter((e) => e.direction === 'IN')
    .reduce((sum, e) => sum + e.remaining, 0)
  const totalOut = events
    .filter((e) => e.direction === 'OUT')
    .reduce((sum, e) => sum + e.remaining, 0)
  const balance = totalIn - totalOut

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button asChild>
          <Link to="/documents/new">New Document</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance (90 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upcoming.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${overdue.length > 0 ? 'text-red-600' : ''}`}>
              {overdue.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {upcoming.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <Link to={`/documents/${d.id}`} className="hover:underline">
                    {d.title}
                  </Link>
                  <span
                    className={`font-medium ${
                      d.direction === 'IN' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {d.direction === 'IN' ? '+' : '-'}
                    {formatCurrency(d.amount_gross, d.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {overdue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Overdue Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {overdue.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <Link to={`/documents/${d.id}`} className="hover:underline">
                    {d.title}
                  </Link>
                  <span className="font-medium text-red-600">
                    {formatCurrency(d.amount_gross, d.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
