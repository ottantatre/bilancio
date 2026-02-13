-- ============================================================
-- Combined Migrations 002-005
-- Apply this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- Migration 002: Counterparties Table & Receipt Form Enum
-- ============================================================

-- New enum for receipt/issue form
CREATE TYPE receipt_form AS ENUM ('paper', 'email', 'national_system', 'edi', 'other');

-- Counterparties table
CREATE TABLE counterparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vat_id TEXT,  -- VAT identification number (NIP in Poland, etc.)
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_counterparties_user_id ON counterparties(user_id);
CREATE INDEX idx_counterparties_vat_id ON counterparties(vat_id) WHERE vat_id IS NOT NULL;

-- RLS policies
ALTER TABLE counterparties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own counterparties"
  ON counterparties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own counterparties"
  ON counterparties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own counterparties"
  ON counterparties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own counterparties"
  ON counterparties FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER trg_counterparties_updated_at
  BEFORE UPDATE ON counterparties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Migration 003: Extend Documents Table
-- ============================================================

-- Add new columns to documents
ALTER TABLE documents
  ADD COLUMN counterparty_id UUID REFERENCES counterparties(id) ON DELETE SET NULL,
  ADD COLUMN receipt_form receipt_form;

-- Index for FK
CREATE INDEX idx_documents_counterparty_id ON documents(counterparty_id);

-- ============================================================
-- Migration 004: Table Column Configuration
-- ============================================================

-- Table column configuration
CREATE TABLE table_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,  -- 'documents', 'payments', etc.
  column_id TEXT NOT NULL,   -- 'issue_date', 'counterparty', etc.
  label TEXT NOT NULL,       -- 'Issue Date', 'Counterparty'
  priority INTEGER NOT NULL, -- 0 = always visible, 1+ = can hide
  accessor TEXT,             -- field name or special identifier like 'computed:vat_amount'
  align TEXT DEFAULT 'left', -- 'left', 'right', 'center'
  width TEXT,                -- '120px', null for auto
  min_screen_width INTEGER,  -- optional minimum pixels
  is_sortable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL, -- for column ordering
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(table_name, column_id)
);

-- Index for fast lookups
CREATE INDEX idx_table_columns_table_name ON table_columns(table_name, is_active, display_order);

-- RLS: Read-only for authenticated users, admin-only write (for now just allow reads)
ALTER TABLE table_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view table columns"
  ON table_columns FOR SELECT
  USING (true);  -- Public config, no user_id needed

-- Seed initial document table columns
INSERT INTO table_columns (table_name, column_id, label, priority, accessor, align, width, display_order) VALUES
  ('documents', 'issue_date', 'Issue Date', 0, 'issue_date', 'left', '110px', 1),
  ('documents', 'counterparty', 'Counterparty', 0, 'counterparty_name', 'left', NULL, 2),
  ('documents', 'vat_id', 'VAT ID', 5, 'counterparty_vat_id', 'left', '120px', 3),
  ('documents', 'document_type', 'Document Type', 6, 'kind', 'left', '140px', 4),
  ('documents', 'receipt_form', 'Receipt/Issue Form', 7, 'receipt_form', 'left', '140px', 5),
  ('documents', 'document_number', 'Document Number', 0, 'number', 'left', '130px', 6),
  ('documents', 'amount_gross', 'Gross Amount', 0, 'amount_gross', 'right', '120px', 7),
  ('documents', 'vat_percentage', 'VAT %', 2, 'computed:vat_percentage', 'right', '80px', 8),
  ('documents', 'vat_amount', 'VAT Amount', 3, 'computed:vat_amount', 'right', '110px', 9),
  ('documents', 'amount_net', 'Net Amount', 3, 'amount_net', 'right', '120px', 10),
  ('documents', 'due_date', 'Payment Due Date', 1, 'due_date', 'left', '130px', 11),
  ('documents', 'payment_date', 'Payment Date', 4, 'computed:latest_payment_date', 'left', '120px', 12),
  ('documents', 'status', 'Status', 0, 'status', 'center', '120px', 13);

-- ============================================================
-- Migration 005: Documents Enhanced View
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
