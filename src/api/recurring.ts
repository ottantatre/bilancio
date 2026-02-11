import { supabase } from '@/lib/supabaseClient'
import type { RecurringRule } from '@/lib/types'

export async function fetchRecurringRules(): Promise<RecurringRule[]> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .order('title', { ascending: true })

  if (error) throw error
  return data as RecurringRule[]
}

export async function createRecurringRule(
  rule: Omit<RecurringRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<RecurringRule> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('recurring_rules')
    .insert({ ...rule, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as RecurringRule
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_rules')
    .delete()
    .eq('id', id)

  if (error) throw error
}
