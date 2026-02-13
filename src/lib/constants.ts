import type { DocumentKind, DocumentStatus, Direction, PaymentMethod, ReceiptForm } from './types'

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  ar_invoice: 'Sales Invoice',
  ap_invoice: 'Purchase Invoice',
  tax: 'Tax',
  standing_order: 'Standing Order',
  lease_instalment: 'Lease Instalment',
  loan_instalment: 'Loan Instalment',
  other: 'Other',
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  planned: 'Planned',
  issued: 'Issued',
  partial: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  issued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
}

export const DIRECTION_LABELS: Record<Direction, string> = {
  IN: 'Income',
  OUT: 'Expense',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Transfer',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
}

export const RECEIPT_FORM_LABELS: Record<ReceiptForm, string> = {
  paper: 'Paper',
  email: 'Email',
  national_system: 'National System',
  edi: 'EDI',
  other: 'Other',
}
