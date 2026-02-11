import { useQuery } from '@tanstack/react-query'
import { fetchCashflow } from '@/api/cashflow'

export function useCashflow(days = 90) {
  return useQuery({
    queryKey: ['cashflow', days],
    queryFn: () => fetchCashflow(days),
  })
}
