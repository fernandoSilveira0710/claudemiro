-- ============================================================
-- Sistema de Progressão
-- Cada veredito guarda um snapshot de métricas e as metas geradas
-- para a próxima vez. Ao refazer (após cooldown), comparamos.
-- ============================================================

ALTER TABLE veredits
  -- snapshot numérico extraído do scanned_data no momento da geração
  -- ex: { steam_total_hours, steam_top_game_hours, instagram_followers,
  --       instagram_posts, spotify_top_artist, ... }
  ADD COLUMN IF NOT EXISTS metrics JSONB,

  -- metas geradas para a PRÓXIMA geração
  -- ex: [{ id, platform, label, metric, target, baseline, done }]
  ADD COLUMN IF NOT EXISTS goals JSONB,

  -- progressão calculada vs o veredito anterior
  -- ex: { overall_delta: +4, skills: [{ name, delta }], goals_met: 2, goals_total: 4 }
  ADD COLUMN IF NOT EXISTS progression JSONB,

  -- id do veredito anterior usado como base da comparação
  ADD COLUMN IF NOT EXISTS previous_veredict_id UUID REFERENCES veredits(id) ON DELETE SET NULL;
