-- ============================================================
-- Extend Documents Table
-- ============================================================

-- Add new columns to documents
ALTER TABLE documents
  ADD COLUMN counterparty_id UUID REFERENCES counterparties(id) ON DELETE SET NULL,
  ADD COLUMN receipt_form receipt_form;

-- Index for FK
CREATE INDEX idx_documents_counterparty_id ON documents(counterparty_id);

-- Note: Keep existing counterparty text field for backward compatibility
-- Future migration can populate counterparty_id by matching counterparty name
