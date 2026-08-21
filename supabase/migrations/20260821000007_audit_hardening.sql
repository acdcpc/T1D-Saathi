-- T1D-Saathi audit hardening
-- Safe to apply repeatedly. This migration protects the live care-team relationship
-- and makes the default signup role deterministic.

BEGIN;

-- care_team contains patient relationship data and must never be publicly readable.
ALTER TABLE public.care_team ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.care_team FROM anon;
REVOKE ALL ON TABLE public.care_team FROM authenticated;
GRANT SELECT ON TABLE public.care_team TO authenticated;

DROP POLICY IF EXISTS "Parents can view care team" ON public.care_team;
DROP POLICY IF EXISTS "Clinicians can view own assignments" ON public.care_team;
DROP POLICY IF EXISTS "care_team_patient_or_clinician_read" ON public.care_team;

CREATE POLICY "care_team_patient_or_clinician_read"
  ON public.care_team
  FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = clinician_id);

-- Care-team assignments are administrative data. The mobile client cannot create,
-- modify, or delete assignments through the table API.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.care_team FROM anon, authenticated;

-- Signup metadata must never choose a privileged application role.
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

-- Defense in depth: client users cannot change their role.
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

COMMIT;
