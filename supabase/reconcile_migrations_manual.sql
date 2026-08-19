-- T1D Saathi — reconcile migration history (optional, bookkeeping only)
-- The 4 migrations below were applied MANUALLY in the SQL Editor (because
-- `supabase db push` returns 403 for this project). Manual SQL Editor runs do
-- NOT write to supabase_migrations.schema_migrations, so this script marks them
-- as applied without re-running anything. Idempotent: safe to run once.
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
('20260812000005', 'fix_rls_recursion', ARRAY[$rc2026$-- Fix infinite recursion between patients <-> care_team RLS policies.
-- SECURITY DEFINER helpers run as the table owner (bypassing RLS), which
-- breaks the circular reference that made INSERT into patients fail with
-- "infinite recursion detected in policy for relation patients".

-- Helper: is the current user an assigned clinician for this patient?
CREATE OR REPLACE FUNCTION public.is_assigned_clinician(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_team
    WHERE care_team.patient_id = p_patient_id
      AND care_team.clinician_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_assigned_clinician(uuid) TO authenticated, anon;

-- Helper: is the current user the parent/owner of this patient?
CREATE OR REPLACE FUNCTION public.is_patient_parent(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = p_patient_id
      AND patients.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_patient_parent(uuid) TO authenticated, anon;

-- Rewrite the recursive policies to use the helpers

-- patients
DROP POLICY IF EXISTS "Clinicians can read assigned patients" ON patients;
CREATE POLICY "Clinicians can read assigned patients" ON patients
  FOR SELECT USING (public.is_assigned_clinician(patients.id));

-- care_team
DROP POLICY IF EXISTS "Parents can view care team" ON care_team;
CREATE POLICY "Parents can view care team" ON care_team
  FOR SELECT USING (public.is_patient_parent(care_team.patient_id));

-- insulin_regimens (was: care_team JOIN patients)
DROP POLICY IF EXISTS "Clinicians can read regimens" ON insulin_regimens;
CREATE POLICY "Clinicians can read regimens" ON insulin_regimens
  FOR SELECT USING (public.is_assigned_clinician(insulin_regimens.patient_id));

-- sick_day_episodes
DROP POLICY IF EXISTS "Clinicians can read episodes" ON sick_day_episodes;
CREATE POLICY "Clinicians can read episodes" ON sick_day_episodes
  FOR SELECT USING (public.is_assigned_clinician(sick_day_episodes.patient_id));

-- glucose_logs
DROP POLICY IF EXISTS "Clinicians can read glucose logs" ON glucose_logs;
CREATE POLICY "Clinicians can read glucose logs" ON glucose_logs
  FOR SELECT USING (public.is_assigned_clinician(glucose_logs.patient_id));

-- ketone_logs
DROP POLICY IF EXISTS "Clinicians can read ketone logs" ON ketone_logs;
CREATE POLICY "Clinicians can read ketone logs" ON ketone_logs
  FOR SELECT USING (public.is_assigned_clinician(ketone_logs.patient_id));

-- assessment_responses
DROP POLICY IF EXISTS "Clinicians can read assessment" ON assessment_responses;
CREATE POLICY "Clinicians can read assessment" ON assessment_responses
  FOR SELECT USING (public.is_assigned_clinician(assessment_responses.patient_id));
$rc2026$]::text[]),
('20260813000006', 'community_app_meta', ARRAY[$rc2026$-- Community feed, app version gate, and crash reporting tables.

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
$rc2026$]::text[]),
('20260814000005', 'safety_hardening', ARRAY[$rc2026$-- Safety hardening for T1D Saathi.
-- Apply this migration before enabling any real-patient dosing workflow.

ALTER TABLE public.insulin_regimens
  ADD COLUMN IF NOT EXISTS approved_by_clinician BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_body_length CHECK (char_length(trim(body)) BETWEEN 1 AND 4000);

-- User metadata must never grant a clinician role. Role assignment belongs to an
-- administrator/controlled server workflow.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'parent'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'profile role changes require an administrator';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own non-role profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Parents may read their own approved regimen; only assigned clinicians can
-- create or change regimen approval data.
DROP POLICY IF EXISTS "Parents can manage regimens" ON public.insulin_regimens;
CREATE POLICY "Parents can read own regimens"
  ON public.insulin_regimens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = insulin_regimens.patient_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Parents can create unapproved regimens"
  ON public.insulin_regimens FOR INSERT
  WITH CHECK (
    approved_by_clinician = false
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = insulin_regimens.patient_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "Parents can update unapproved regimens"
  ON public.insulin_regimens FOR UPDATE
  USING (
    approved_by_clinician = false
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = insulin_regimens.patient_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (approved_by_clinician = false);

DROP POLICY IF EXISTS "Clinicians can read regimens" ON public.insulin_regimens;
CREATE POLICY "Clinicians can read assigned regimens"
  ON public.insulin_regimens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.care_team ct
    WHERE ct.patient_id = insulin_regimens.patient_id AND ct.clinician_id = auth.uid()
  ));
CREATE POLICY "Clinicians can approve assigned regimens"
  ON public.insulin_regimens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.care_team ct
    WHERE ct.patient_id = insulin_regimens.patient_id AND ct.clinician_id = auth.uid()
  ))
  WITH CHECK (
    approved_by_clinician = true
    AND approved_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can send/receive messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can read related messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );
CREATE POLICY "Users can send related messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND patient_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.care_team ct
      WHERE ct.patient_id = messages.patient_id
        AND (ct.clinician_id = auth.uid() OR ct.clinician_id = messages.recipient_id)
    )
  );
$rc2026$]::text[]),
('20260814000006', 'offline_idempotency', ARRAY[$rc2026$-- Idempotency keys for offline-first health records.
ALTER TABLE public.glucose_logs ADD COLUMN IF NOT EXISTS client_event_id TEXT;
ALTER TABLE public.ketone_logs ADD COLUMN IF NOT EXISTS client_event_id TEXT;
ALTER TABLE public.sick_day_episodes ADD COLUMN IF NOT EXISTS client_event_id TEXT;
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS client_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS glucose_logs_client_event_id_idx ON public.glucose_logs (client_event_id) WHERE client_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ketone_logs_client_event_id_idx ON public.ketone_logs (client_event_id) WHERE client_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sick_day_episodes_client_event_id_idx ON public.sick_day_episodes (client_event_id) WHERE client_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meal_logs_client_event_id_idx ON public.meal_logs (client_event_id) WHERE client_event_id IS NOT NULL;
$rc2026$]::text[])
ON CONFLICT (version) DO NOTHING;
