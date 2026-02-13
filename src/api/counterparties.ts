import { supabase } from '@/lib/supabaseClient'
import type { Counterparty, CounterpartyInsert } from '@/lib/types'

export async function fetchCounterparties(): Promise<Counterparty[]> {
  const { data, error } = await supabase
    .from('counterparties')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export async function createCounterparty(insert: CounterpartyInsert): Promise<Counterparty> {
  const { data, error } = await supabase
    .from('counterparties')
    .insert(insert)
    .select()
    .single()

  if (error) throw error
  return data
}
