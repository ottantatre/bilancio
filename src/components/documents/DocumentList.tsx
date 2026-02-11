import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from './StatusBadge'
import { DOCUMENT_KIND_LABELS, DIRECTION_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Document } from '@/lib/types'

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No documents to display.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell>
              <Link to={`/documents/${doc.id}`} className="font-medium hover:underline">
                {doc.title}
              </Link>
              {doc.number && (
                <span className="ml-2 text-sm text-muted-foreground">{doc.number}</span>
              )}
            </TableCell>
            <TableCell className="text-sm">{DOCUMENT_KIND_LABELS[doc.kind]}</TableCell>
            <TableCell className="text-sm">{DIRECTION_LABELS[doc.direction]}</TableCell>
            <TableCell className="text-sm">{formatDate(doc.due_date)}</TableCell>
            <TableCell>
              <StatusBadge status={doc.status} />
            </TableCell>
            <TableCell
              className={`text-right font-medium ${
                doc.direction === 'IN' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {doc.direction === 'IN' ? '+' : '-'}
              {formatCurrency(doc.amount_gross, doc.currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
