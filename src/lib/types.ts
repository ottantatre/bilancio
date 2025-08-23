export type Direction = 'IN' | 'OUT';
export type DocumentKind = 'ar_invoice' | 'ap_invoice' | 'tax' | 'standing_order' | 'lease_instalment' | 'loan_instalment' | 'other';
export type DocumentStatus = 'planned' | 'issued' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface CashflowEvent {
  event_date: string;
  title: string;
  direction: Direction;
  kind: DocumentKind;
  status: DocumentStatus;
  amount: number;
  currency: string;
  document_id: string | null;
  source: string;
}
