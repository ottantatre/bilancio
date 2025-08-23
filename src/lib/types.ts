export type Direction = 'IN' | 'OUT';
export type DocumentKind =
  | 'ar_invoice'
  | 'ap_invoice'
  | 'tax'
  | 'standing_order'
  | 'lease_instalment'
  | 'loan_instalment'
  | 'other';
export type DocumentStatus = 'planned' | 'issued' | 'partial' | 'paid' | 'overdue' | 'cancelled';
