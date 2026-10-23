/*
# X-Hunter AI: User Settings, Leads, and Campaigns Tables

## Purpose
Create the persistent database schema for the X-Hunter AI dashboard. This is a multi-user
application — each user signs in with email/password, and all their data (credentials, scraped
leads, campaign history) is isolated per user via Row Level Security.

## New Tables

### 1. user_settings
Stores each user's X/Twitter credentials and AI provider API key.
- `id` (uuid, PK) — surrogate key
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid()) — owner, FK to auth.users
- `x_handle` (text) — the user's X/Twitter handle
- `auth_method` (text, default 'api') — 'api' or 'cookie'
- `api_key` (text) — X API key (encrypted at rest by app layer)
- `api_secret` (text) — X API secret
- `access_token` (text) — X access token
- `access_token_secret` (text) — X access token secret
- `cookie_token` (text) — X auth cookie token (for browser automation)
- `ai_provider` (text, default 'openai') — 'openai' or 'claude'
- `ai_api_key` (text) — OpenAI or Claude API key
- `updated_at` (timestamptz) — last modification timestamp

### 2. leads
Stores scraped Twitter/X leads for each user.
- `id` (uuid, PK, DEFAULT gen_random_uuid())
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid()) — owner, FK to auth.users
- `handle` (text, not null) — Twitter handle (e.g. @user)
- `display_name` (text, not null) — display name
- `followers` (integer, default 0) — follower count
- `bio` (text, default '') — profile bio
- `status` (text, not null, default 'pending') — pending | contacted | replied
- `sent_dm` (text) — the DM text sent to this lead
- `reply_text` (text) — the reply received from this lead
- `reply_intent` (text) — interested | query | pricing | objection | null
- `created_at` (timestamptz, default now())

### 3. campaigns
Stores campaign metadata for each scraping/messaging session.
- `id` (uuid, PK, DEFAULT gen_random_uuid())
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid()) — owner, FK to auth.users
- `name` (text, not null) — campaign name
- `keywords` (text) — keywords used
- `type` (text, not null, default 'scrape') — scrape | dm | inbox
- `leads_count` (integer, default 0) — number of leads affected
- `status` (text, not null, default 'completed') — running | completed | stopped
- `created_at` (timestamptz, default now())

## Security

### Row Level Security
All three tables have RLS enabled. Each table has 4 policies (SELECT, INSERT, UPDATE, DELETE)
scoped to `TO authenticated` with `auth.uid() = user_id` ownership checks.

### Grants
- `user_settings`: SELECT, INSERT, UPDATE, DELETE to `authenticated` only
- `leads`: SELECT, INSERT, UPDATE, DELETE to `authenticated` only
- `campaigns`: SELECT, INSERT, UPDATE, DELETE to `authenticated` only

## Important Notes
1. `user_id` columns default to `auth.uid()` so frontend inserts that omit `user_id` succeed.
2. Each user can only see and modify their own rows — no cross-user data access.
3. ON DELETE CASCADE ensures data is cleaned up when a user account is deleted.
*/

-- ============================================================================
-- 1. user_settings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  x_handle text DEFAULT '',
  auth_method text DEFAULT 'api',
  api_key text DEFAULT '',
  api_secret text DEFAULT '',
  access_token text DEFAULT '',
  access_token_secret text DEFAULT '',
  cookie_token text DEFAULT '',
  ai_provider text DEFAULT 'openai',
  ai_api_key text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;

DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON user_settings;
CREATE POLICY "delete_own_settings" ON user_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Auto-update updated_at on user_settings changes
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS settings_updated_at ON user_settings;
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

-- ============================================================================
-- 2. leads table
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL,
  display_name text NOT NULL,
  followers integer DEFAULT 0,
  bio text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  sent_dm text,
  reply_text text,
  reply_intent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO authenticated;

DROP POLICY IF EXISTS "select_own_leads" ON leads;
CREATE POLICY "select_own_leads" ON leads FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_leads" ON leads;
CREATE POLICY "insert_own_leads" ON leads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_leads" ON leads;
CREATE POLICY "update_own_leads" ON leads FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_leads" ON leads;
CREATE POLICY "delete_own_leads" ON leads FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);

-- ============================================================================
-- 3. campaigns table
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  keywords text DEFAULT '',
  type text NOT NULL DEFAULT 'scrape',
  leads_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;

DROP POLICY IF EXISTS "select_own_campaigns" ON campaigns;
CREATE POLICY "select_own_campaigns" ON campaigns FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_campaigns" ON campaigns;
CREATE POLICY "insert_own_campaigns" ON campaigns FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_campaigns" ON campaigns;
CREATE POLICY "update_own_campaigns" ON campaigns FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_campaigns" ON campaigns;
CREATE POLICY "delete_own_campaigns" ON campaigns FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
