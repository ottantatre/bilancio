export type Direction = 'IN' | 'OUT'

export type DocumentKind =
  | 'ar_invoice'
  | 'ap_invoice'
  | 'tax'
  | 'standing_order'
  | 'lease_instalment'
  | 'loan_instalment'
  | 'other'

export type DocumentStatus =
  | 'planned'
  | 'issued'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'

export type PaymentMethod = 'transfer' | 'cash' | 'card' | 'other'

export type ReceiptForm = 'paper' | 'email' | 'national_system' | 'edi' | 'other'

export interface Counterparty {
  id: string
  user_id: string
  name: string
  vat_id: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CounterpartyInsert {
  name: string
  vat_id?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

export interface Document {
  id: string
  user_id: string
  kind: DocumentKind
  direction: Direction
  status: DocumentStatus
  number: string | null
  title: string
  counterparty: string | null
  counterparty_id: string | null
  receipt_form: ReceiptForm | null
  issue_date: string | null
  due_date: string
  amount_net: number | null
  amount_gross: number
  currency: string
  notes: string | null
  recurring_rule_id: string | null
  created_at: string
  updated_at: string
}

export interface DocumentEnhanced extends Document {
  counterparty_name: string | null
  counterparty_vat_id: string | null
  vat_amount: number | null
  vat_percentage: number | null
  latest_payment_date: string | null
  total_paid: number
}

export interface DocumentLine {
  id: string
  document_id: string
  description: string
  qty: number
  unit_price: number
  vat_rate: number
  amount_net: number
  amount_gross: number
  created_at: string
}

export interface Payment {
  id: string
  document_id: string
  paid_date: string
  amount: number
  method: PaymentMethod
  note: string | null
  created_at: string
}

export interface RecurringRule {
  id: string
  user_id: string
  kind: DocumentKind
  direction: Direction
  title: string
  amount: number
  currency: string
  day_of_month: number
  interval_months: number
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CashflowEvent {
  document_id: string
  user_id: string
  event_date: string
  title: string
  direction: Direction
  kind: DocumentKind
  status: DocumentStatus
  amount: number
  paid_amount: number
  remaining: number
  currency: string
}

export interface DocumentInsert {
  kind: DocumentKind
  direction: Direction
  status?: DocumentStatus
  number?: string
  title: string
  counterparty?: string
  issue_date?: string
  due_date: string
  amount_net?: number
  amount_gross: number
  currency?: string
  notes?: string
}

export interface DocumentUpdate extends Partial<DocumentInsert> {
  id: string
}

export interface PaymentInsert {
  document_id: string
  paid_date: string
  amount: number
  method?: PaymentMethod
  note?: string
}

export interface TableColumn {
  id: string
  table_name: string
  column_id: string
  label: string
  priority: number
  accessor: string | null
  align: 'left' | 'right' | 'center'
  width: string | null
  min_screen_width: number | null
  is_sortable: boolean
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface ColumnConfig {
  id: string
  label: string
  priority: number
  accessor: string | ((row: any) => any)
  align?: 'left' | 'right' | 'center'
  width?: string
  formatter?: (value: any, row: any) => React.ReactNode
}
