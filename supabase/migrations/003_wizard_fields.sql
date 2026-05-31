-- Campos do wizard da etapa final + gate temporal

ALTER TABLE veredits ADD COLUMN IF NOT EXISTS frame_type TEXT
  CHECK (frame_type IN ('brilhante', 'dourada', 'cinza')) DEFAULT 'cinza';
ALTER TABLE veredits ADD COLUMN IF NOT EXISTS base_image_url TEXT;
ALTER TABLE veredits ADD COLUMN IF NOT EXISTS is_custom_upload BOOLEAN DEFAULT false;
ALTER TABLE veredits ADD COLUMN IF NOT EXISTS visible_fields JSONB;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_generation_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flex_type TEXT
  CHECK (flex_type IN ('one_time_monthly', 'per_generation'));
