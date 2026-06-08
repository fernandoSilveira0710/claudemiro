-- Emoji que resume o usuário, exibido ao lado do overall no card.
ALTER TABLE veredits
  ADD COLUMN IF NOT EXISTS summary_emoji TEXT;
