-- ============================================================
-- Claudemiro — Card Structure Feature
-- Campos novos do card (overall, skills, hashtags, main_trait),
-- estilo de imagem decidido pela IA, fonte da imagem base,
-- gráfico "mapa pessoal" e sistema de likes/deslikes.
-- ============================================================

-- ── Novos campos no veredito ────────────────────────────────
ALTER TABLE veredits
  ADD COLUMN IF NOT EXISTS main_trait        TEXT,                 -- destaque em negrito no topo (ex: "Nerd", "Rato de academia")
  ADD COLUMN IF NOT EXISTS overall           SMALLINT,             -- nota estilo FIFA, 40–99
  ADD COLUMN IF NOT EXISTS skills            JSONB,                -- [{ name, value, emoji }]
  ADD COLUMN IF NOT EXISTS hashtags          JSONB,                -- ["#nerdola", "#antisocial", ...]
  ADD COLUMN IF NOT EXISTS summary_short     TEXT,                 -- resumo conciso no tom (frase única)
  ADD COLUMN IF NOT EXISTS personal_map      JSONB,               -- gráfico do "mapa pessoal": [{ axis, value, comment }]
  ADD COLUMN IF NOT EXISTS image_style       TEXT,                 -- estilo escolhido pela IA: engracado|casual|profissional
  ADD COLUMN IF NOT EXISTS image_source      TEXT DEFAULT 'generated', -- generated|network|upload
  ADD COLUMN IF NOT EXISTS image_brief       JSONB,                -- brief visual estruturado da IA (vira o prompt por regras)
  ADD COLUMN IF NOT EXISTS image_prompt      TEXT,                 -- prompt final usado no Gemini (auditoria/regenerar)
  ADD COLUMN IF NOT EXISTS likes_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dislikes_count    INTEGER DEFAULT 0;

ALTER TABLE veredits
  ADD CONSTRAINT veredits_overall_range CHECK (overall IS NULL OR (overall BETWEEN 40 AND 99));

ALTER TABLE veredits
  ADD CONSTRAINT veredits_image_style_chk CHECK (image_style IS NULL OR image_style IN ('engracado','casual','profissional'));

ALTER TABLE veredits
  ADD CONSTRAINT veredits_image_source_chk CHECK (image_source IN ('generated','network','upload'));

-- ── Reações (like / deslike) ────────────────────────────────
CREATE TABLE IF NOT EXISTS card_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veredict_id UUID NOT NULL REFERENCES veredits(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL, -- null = anônimo (perfil público)
  anon_key    TEXT,                                            -- hash de IP/fingerprint p/ anônimos
  reaction    TEXT NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- 1 reação por usuário logado por card
  UNIQUE (veredict_id, user_id),
  -- 1 reação por anônimo por card
  UNIQUE (veredict_id, anon_key)
);

CREATE INDEX IF NOT EXISTS idx_card_reactions_veredict ON card_reactions(veredict_id);

-- ── Trigger: manter contadores sincronizados ────────────────
CREATE OR REPLACE FUNCTION sync_reaction_counts() RETURNS TRIGGER AS $$
DECLARE
  target UUID := COALESCE(NEW.veredict_id, OLD.veredict_id);
BEGIN
  UPDATE veredits v SET
    likes_count    = (SELECT COUNT(*) FROM card_reactions r WHERE r.veredict_id = target AND r.reaction = 'like'),
    dislikes_count = (SELECT COUNT(*) FROM card_reactions r WHERE r.veredict_id = target AND r.reaction = 'dislike')
  WHERE v.id = target;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_reaction_counts ON card_reactions;
CREATE TRIGGER trg_sync_reaction_counts
  AFTER INSERT OR UPDATE OR DELETE ON card_reactions
  FOR EACH ROW EXECUTE FUNCTION sync_reaction_counts();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE card_reactions ENABLE ROW LEVEL SECURITY;

-- qualquer um pode ver as reações de cards públicos
DROP POLICY IF EXISTS card_reactions_select ON card_reactions;
CREATE POLICY card_reactions_select ON card_reactions
  FOR SELECT USING (true);

-- usuário logado gerencia a própria reação
DROP POLICY IF EXISTS card_reactions_mutate ON card_reactions;
CREATE POLICY card_reactions_mutate ON card_reactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
