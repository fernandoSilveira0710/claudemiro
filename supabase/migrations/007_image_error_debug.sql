-- Coluna de diagnóstico: guarda o erro da geração de imagem (Gemini/Storage)
-- pra inspecionar direto no Supabase quando o card_image_url não é gerado.
ALTER TABLE veredits
  ADD COLUMN IF NOT EXISTS image_error TEXT;
