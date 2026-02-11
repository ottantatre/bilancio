import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/documents/StatusBadge'
import { DOCUMENT_KIND_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { CashflowEvent } from '@/lib/types'
import dayjs from 'dayjs'

interface CashflowTimelineProps {
  events: CashflowEvent[]
}

export function CashflowTimeline({ events }: CashflowTimelineProps) {
  const grouped = events.reduce<Record<string, CashflowEvent[]>>((acc, event) => {
    const key = event.event_date
    ;(acc[key] ||= []).push(event)
    return acc
  }, {})

  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No cashflow events in the selected period.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, items]) => (
        <Card key={date}>
          <CardContent className="pt-4">
            <div className="mb-2 text-sm font-medium text-muted-foreground">
              {formatDate(date)} — {dayjs(date).format('dddd')}
            </div>
            <ul className="divide-y">
              {items.map((e) => (
                <li key={e.document_id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{DOCUMENT_KIND_LABELS[e.kind]}</span>
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-medium ${
                        e.direction === 'IN' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {e.direction === 'IN' ? '+' : '-'}
                      {formatCurrency(e.remaining, e.currency)}
                    </div>
                    {e.paid_amount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        paid: {formatCurrency(e.paid_amount, e.currency)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
