import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDocument, updateDocument, deleteDocument } from '@/api/documents'
import type { DocumentInsert, DocumentUpdate } from '@/lib/types'

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (doc: DocumentInsert) => createDocument(doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (doc: DocumentUpdate) => updateDocument(doc),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document', data.id] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}
