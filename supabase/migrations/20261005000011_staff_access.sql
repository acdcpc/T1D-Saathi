-- Batch 3: staff access (clinician admins) + push delivery tokens.
-- Applied to live 2026-10-05. Idempotent.

-- 1) Staff email registry. Staff emails become clinicians at signup and get
--    full-access policies (read-all + care-team management + regimen approval).
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY,          -- stored lowercase
  full_access BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_emails FROM PUBLIC, anon, authenticated;

INSERT INTO public.admin_emails (email, full_access, note) VALUES
  ('thisispratha@gmail.com', true, 'Owner / developer — full access'),
  ('archananepal@pahs.edu.np', true, 'Supervising clinician (PAHS) — full access')
ON CONFLICT (email) DO UPDATE SET full_access = EXCLUDED.full_access, note = EXCLUDED.note;

-- 2) Helper (self-scoped; used by policies)
CREATE OR REPLACE FUNCTION public.is_app_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_emails ae
    JOIN auth.users u ON lower(u.email) = ae.email
    WHERE u.id = p_user_id AND ae.full_access
  );
END; $$;
REVOKE ALL ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated;

-- 3) Signup role: staff emails become clinicians automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN EXISTS (SELECT 1 FROM public.admin_emails ae WHERE ae.email = lower(NEW.email) AND ae.full_access)
         THEN 'clinician' ELSE 'parent' END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

-- 4) Upgrade existing staff accounts (service path bypasses the role-change guard).
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  UPDATE public.profiles p SET role = 'clinician'
  FROM auth.users u
  WHERE u.id = p.user_id
    AND lower(u.email) IN (SELECT email FROM public.admin_emails WHERE full_access)
    AND p.role IS DISTINCT FROM 'clinician';
END $$;

-- 5) Full-access read policies
DROP POLICY IF EXISTS "Admins read all patients" ON public.patients;
CREATE POLICY "Admins read all patients" ON public.patients
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all glucose logs" ON public.glucose_logs;
CREATE POLICY "Admins read all glucose logs" ON public.glucose_logs
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all ketone logs" ON public.ketone_logs;
CREATE POLICY "Admins read all ketone logs" ON public.ketone_logs
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all sick day episodes" ON public.sick_day_episodes;
CREATE POLICY "Admins read all sick day episodes" ON public.sick_day_episodes
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all meal logs" ON public.meal_logs;
CREATE POLICY "Admins read all meal logs" ON public.meal_logs
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all insulin logs" ON public.insulin_logs;
CREATE POLICY "Admins read all insulin logs" ON public.insulin_logs
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all consents" ON public.consents;
CREATE POLICY "Admins read all consents" ON public.consents
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all assessments" ON public.assessment_responses;
CREATE POLICY "Admins read all assessments" ON public.assessment_responses
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all care team" ON public.care_team;
CREATE POLICY "Admins read all care team" ON public.care_team
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all regimens" ON public.insulin_regimens;
CREATE POLICY "Admins read all regimens" ON public.insulin_regimens
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update regimens" ON public.insulin_regimens;
CREATE POLICY "Admins update regimens" ON public.insulin_regimens
  FOR UPDATE USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

-- 6) Care-team management functions (admin-only; care_team client writes stay revoked)
CREATE OR REPLACE FUNCTION public.admin_add_care_team_member(p_patient_id uuid, p_email text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid;
BEGIN
  IF NOT public.is_app_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No account found for that email';
  END IF;
  INSERT INTO public.care_team (patient_id, clinician_id, role)
    VALUES (p_patient_id, v_user, 'primary')
    ON CONFLICT (patient_id, clinician_id) DO NOTHING;
  RETURN v_user;
END; $$;
REVOKE ALL ON FUNCTION public.admin_add_care_team_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_care_team_member(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_care_team_member(p_patient_id uuid, p_clinician_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_app_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  DELETE FROM public.care_team WHERE patient_id = p_patient_id AND clinician_id = p_clinician_id;
END; $$;
REVOKE ALL ON FUNCTION public.admin_remove_care_team_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_care_team_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_staff()
RETURNS TABLE (user_id uuid, email text, full_name text, role text, full_access boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_app_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
    SELECT u.id, lower(u.email)::text, p.full_name, p.role,
           EXISTS (SELECT 1 FROM public.admin_emails ae WHERE ae.email = lower(u.email) AND ae.full_access)
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p.role = 'clinician'
       OR EXISTS (SELECT 1 FROM public.admin_emails ae WHERE ae.email = lower(u.email))
    ORDER BY lower(u.email);
END; $$;
REVOKE ALL ON FUNCTION public.admin_list_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_staff() TO authenticated;

-- 7) Push delivery tokens (remote caregiver alerts)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_tokens TO authenticated;

DROP POLICY IF EXISTS "Users manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users manage own push tokens" ON public.push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
