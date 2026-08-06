-- Run this in Supabase SQL Editor to add the mobile redirect URL
-- Or configure via Dashboard: Authentication → URL Configuration

-- The app uses scheme: com.t1dsaathi.app
-- Supabase callback: https://jwslcxgnwlsqbrtmmqvf.supabase.co/auth/v1/callback

-- To add via SQL:
BEGIN;
  -- List current redirect URLs
  SELECT * FROM auth.redirect_urls;

  -- Add mobile scheme redirect (run this if not already present via dashboard)
  -- INSERT INTO auth.redirect_urls (url) VALUES ('com.t1dsaathi.app://auth/callback');
COMMIT;
