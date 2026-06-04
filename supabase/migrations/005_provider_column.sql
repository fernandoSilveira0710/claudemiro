-- ============================================================
-- Claudemiro — 005: AbacatePay + provider column
-- ============================================================

-- Add provider column to payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mercado_pago';

-- Add 'per_generation' to type check constraint
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_type_check;

ALTER TABLE payments 
ADD CONSTRAINT payments_type_check 
CHECK (type IN ('one_time', 'subscription', 'per_generation'));

-- Create index for provider + external_id lookups (webhook)
CREATE INDEX IF NOT EXISTS idx_payments_provider_ext_id 
ON payments(provider, mercado_pago_id);
