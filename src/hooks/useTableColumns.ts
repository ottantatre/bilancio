import { useQuery } from '@tanstack/react-query'
import { fetchTableColumns } from '@/api/tableColumns'

export function useTableColumns(tableName: string) {
  return useQuery({
    queryKey: ['tableColumns', tableName],
    queryFn: () => fetchTableColumns(tableName),
    staleTime: 1000 * 60 * 15, // 15 minutes - config doesn't change often
  })
}
