import { useMemo, useState, useEffect } from 'react'
import { useResizeObserver } from '@/hooks/useResizeObserver'
import { calculateVisibleColumns } from '@/lib/tableUtils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'
import type { ColumnConfig } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps<T> {
  columns: ColumnConfig[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function ResponsiveTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data to display.',
}: ResponsiveTableProps<T>) {
  const { ref, width } = useResizeObserver<HTMLDivElement>()
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([])

  // Calculate visible columns when width or columns change
  useEffect(() => {
    if (width > 0) {
      const visible = calculateVisibleColumns(columns, width)
      setVisibleColumnIds(visible)
    }
  }, [width, columns])

  // Filter to visible columns only
  const visibleColumns = useMemo(() => {
    if (visibleColumnIds.length === 0) return columns // Show all until width calculated
    return columns.filter(col => visibleColumnIds.includes(col.id))
  }, [columns, visibleColumnIds])

  // Get cell value using accessor
  const getCellValue = (row: T, column: ColumnConfig): any => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row)
    }
    return (row as any)[column.accessor]
  }

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div ref={ref} className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center'
                )}
                style={{ width: column.width || 'auto' }}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {visibleColumns.map((column) => {
                const value = getCellValue(row, column)
                const formatted = column.formatter
                  ? column.formatter(value, row)
                  : value

                return (
                  <TableCell
                    key={column.id}
                    className={cn(
                      'text-sm',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center'
                    )}
                  >
                    {formatted}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
