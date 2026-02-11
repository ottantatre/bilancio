import { supabase } from '@/lib/supabaseClient'
import type { CashflowEvent } from '@/lib/types'

export async function fetchCashflow(days = 90): Promise<CashflowEvent[]> {
  const today = new Date().toISOString().slice(0, 10)
  const futureDate = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('cashflow_view')
    .select('*')
    .gte('event_date', today)
    .lte('event_date', futureDate)
    .order('event_date', { ascending: true })

  if (error) throw error
  return data as CashflowEvent[]
}
