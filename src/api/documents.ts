import { supabase } from '@/lib/supabaseClient'
import type { Document, DocumentInsert, DocumentUpdate } from '@/lib/types'

export interface DocumentFilters {
  kind?: string
  status?: string
  direction?: string
  search?: string
}

export async function fetchDocuments(filters?: DocumentFilters): Promise<Document[]> {
  let query = supabase
    .from('documents')
    .select('*')
    .order('due_date', { ascending: true })

  if (filters?.kind) {
    query = query.eq('kind', filters.kind)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.direction) {
    query = query.eq('direction', filters.direction)
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,number.ilike.%${filters.search}%,counterparty.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Document[]
}

export async function fetchDocument(id: string): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Document
}

export async function createDocument(doc: DocumentInsert): Promise<Document> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('documents')
    .insert({ ...doc, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Document
}

export async function updateDocument({ id, ...updates }: DocumentUpdate): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Document
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}
