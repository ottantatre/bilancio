import { supabase } from '@/lib/supabaseClient'
import type { Payment, PaymentInsert } from '@/lib/types'

export async function fetchPayments(documentId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('document_id', documentId)
    .order('paid_date', { ascending: true })

  if (error) throw error
  return data as Payment[]
}

export async function createPayment(payment: PaymentInsert): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()

  if (error) throw error
  return data as Payment
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)

  if (error) throw error
}
