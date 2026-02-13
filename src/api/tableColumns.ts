import { supabase } from '@/lib/supabaseClient'
import type { TableColumn } from '@/lib/types'

export async function fetchTableColumns(tableName: string): Promise<TableColumn[]> {
  const { data, error } = await supabase
    .from('table_columns')
    .select('*')
    .eq('table_name', tableName)
    .eq('is_active', true)
    .order('display_order')

  if (error) throw error
  return data || []
}
