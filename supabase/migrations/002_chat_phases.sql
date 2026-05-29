-- ============================================================
-- Chat com fases estruturadas
-- ============================================================

-- Adicionar colunas de fase
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'icebreaker';

ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS phase_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS scanned_data JSONB DEFAULT NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_sessions_updated_at();
