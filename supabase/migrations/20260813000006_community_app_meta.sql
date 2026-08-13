-- Community feed, app version gate, and crash reporting tables.

-- 1. Caregiver community posts
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read posts" ON community_posts;
CREATE POLICY "Anyone can read posts" ON community_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can post" ON community_posts;
CREATE POLICY "Authenticated users can post" ON community_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2. App version gate (read by all clients)
CREATE TABLE IF NOT EXISTS app_versions (
  id SERIAL PRIMARY KEY,
  latest TEXT NOT NULL,
  min_required TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read app versions" ON app_versions;
CREATE POLICY "Anyone can read app versions" ON app_versions FOR SELECT USING (true);

-- 3. Crash reports (insert only)
CREATE TABLE IF NOT EXISTS crash_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT,
  stack TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crash_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can report crashes" ON crash_reports;
CREATE POLICY "Authenticated users can report crashes" ON crash_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Helpline clinician credentials + clinic hours
ALTER TABLE helplines ADD COLUMN IF NOT EXISTS credentials TEXT;
ALTER TABLE helplines ADD COLUMN IF NOT EXISTS hours TEXT;
