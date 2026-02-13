-- ============================================================
-- Documents Enhanced View
-- ============================================================

CREATE OR REPLACE VIEW documents_enhanced AS
SELECT
  d.*,
  c.name as counterparty_name,
  c.vat_id as counterparty_vat_id,
  -- VAT amount (gross - net)
  CASE
    WHEN d.amount_net IS NOT NULL THEN d.amount_gross - d.amount_net
    ELSE NULL
  END as vat_amount,
  -- VAT percentage (calculated from first document line if available)
  (SELECT dl.vat_rate FROM document_lines dl WHERE dl.document_id = d.id LIMIT 1) as vat_percentage,
  -- Latest payment date
  (SELECT MAX(p.paid_date) FROM payments p WHERE p.document_id = d.id) as latest_payment_date,
  -- Total paid amount
  COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.document_id = d.id), 0) as total_paid
FROM documents d
LEFT JOIN counterparties c ON c.id = d.counterparty_id;
