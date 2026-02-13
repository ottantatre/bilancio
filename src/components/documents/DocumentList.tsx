import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { useTableColumns } from '@/hooks/useTableColumns'
import { formatDocumentColumn } from '@/lib/columnFormatters'
import type { DocumentEnhanced, ColumnConfig } from '@/lib/types'

interface DocumentListProps {
  documents: DocumentEnhanced[]
}

export function DocumentList({ documents }: DocumentListProps) {
  const navigate = useNavigate()
  const { data: tableColumns, isLoading } = useTableColumns('documents')

  // Transform TableColumn[] to ColumnConfig[]
  const columns = useMemo<ColumnConfig[]>(() => {
    if (!tableColumns) return []

    return tableColumns.map(col => ({
      id: col.column_id,
      label: col.label,
      priority: col.priority,
      accessor: col.accessor || col.column_id,
      align: col.align as 'left' | 'right' | 'center',
      width: col.width || undefined,
      formatter: (value: any, row: DocumentEnhanced) =>
        formatDocumentColumn(col.column_id, value, row),
    }))
  }, [tableColumns])

  if (isLoading) {
    return <p className="py-8 text-center text-muted-foreground">Loading...</p>
  }

  return (
    <ResponsiveTable
      columns={columns}
      data={documents}
      onRowClick={(doc) => navigate(`/documents/${doc.id}`)}
      emptyMessage="No documents to display."
    />
  )
}
