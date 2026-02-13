-- ============================================================
-- Counterparties Table & Receipt Form Enum
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
