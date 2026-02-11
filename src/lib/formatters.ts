import dayjs from 'dayjs'

export function formatCurrency(amount: number, currency = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return dayjs(date).format('DD.MM.YYYY')
}

export function formatDateShort(date: string): string {
  return dayjs(date).format('DD.MM')
}
