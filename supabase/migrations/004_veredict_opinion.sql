-- Campos de opinião final e destaques das redes no veredito

ALTER TABLE veredits ADD COLUMN IF NOT EXISTS final_opinion TEXT;
ALTER TABLE veredits ADD COLUMN IF NOT EXISTS network_highlights JSONB;
ALTER TABLE veredits ADD COLUMN IF NOT EXISTS user_name TEXT;
