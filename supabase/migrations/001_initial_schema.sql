-- ============================================================
-- Claudemiro — Database Schema
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'FLEX', 'PRO')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social connections
CREATE TABLE IF NOT EXISTS social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','spotify','youtube','tiktok','x','steam','discord')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_user_id TEXT,
  platform_username TEXT,
  raw_data JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Veredits (results)
CREATE TABLE IF NOT EXISTS veredits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('engracado', 'casual', 'profissional')),
  card_image_url TEXT,
  veredict_text TEXT,
  veredict_badge TEXT,
  tags JSONB,
  niche TEXT,
  niche_colors JSONB,
  music_track JSONB,
  political_stance JSONB,
  sensitive_topics JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2),
  type TEXT CHECK (type IN ('one_time', 'subscription')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','refunded')),
  mercado_pago_id TEXT,
  plan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenges (streaks)
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_text TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE veredits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: público pode ver, dono pode editar
CREATE POLICY "Public profiles viewable" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Social connections: apenas dono
CREATE POLICY "Users CRUD own connections" ON social_connections
  FOR ALL USING (auth.uid() = user_id);

-- Veredits: públicos visíveis, dono CRUD
CREATE POLICY "Public veredits viewable" ON veredits
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users CRUD own veredits" ON veredits
  FOR ALL USING (auth.uid() = user_id);

-- Payments: dono vê
CREATE POLICY "Users view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Challenges: dono CRUD
CREATE POLICY "Users CRUD own challenges" ON challenges
  FOR ALL USING (auth.uid() = user_id);

-- Chat sessions: dono CRUD
CREATE POLICY "Users CRUD own chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Storage bucket for cards
-- ============================================================

-- Criar bucket 'cards' via Supabase Dashboard:
-- 1. Storage → New Bucket → "cards"
-- 2. Public bucket: ON
-- 3. File size: 10MB
-- 4. Allowed MIME: image/png, image/jpeg, image/webp
