import { useQuery } from '@tanstack/react-query'
import { fetchDocuments, type DocumentFilters } from '@/api/documents'

export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => fetchDocuments(filters),
  })
}
