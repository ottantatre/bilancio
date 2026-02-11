import { useQuery } from '@tanstack/react-query'
import { fetchDocument } from '@/api/documents'

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id),
    enabled: !!id,
  })
}
