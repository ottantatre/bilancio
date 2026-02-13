import { formatCurrency, formatDate } from './formatters'
import { StatusBadge } from '@/components/documents/StatusBadge'
import { DOCUMENT_KIND_LABELS, RECEIPT_FORM_LABELS } from './constants'
import type { DocumentEnhanced } from './types'

export function formatDocumentColumn(
  columnId: string,
  value: any,
  doc: DocumentEnhanced
): React.ReactNode {
  switch (columnId) {
    case 'issue_date':
    case 'due_date':
    case 'payment_date':
      return value ? formatDate(value) : '—'

    case 'document_type':
      return DOCUMENT_KIND_LABELS[doc.kind] || doc.kind

    case 'receipt_form':
      return value ? (RECEIPT_FORM_LABELS[value as keyof typeof RECEIPT_FORM_LABELS] || value) : '—'

    case 'amount_gross':
    case 'amount_net':
    case 'vat_amount':
      return value != null ? formatCurrency(value, doc.currency) : '—'

    case 'vat_percentage':
      return value != null ? `${value}%` : '—'

    case 'status':
      return <StatusBadge status={doc.status} />

    case 'counterparty':
      return doc.counterparty_name || doc.counterparty || '—'

    case 'vat_id':
      return doc.counterparty_vat_id || '—'

    case 'document_number':
      return value || '—'

    default:
      return value || '—'
  }
}
