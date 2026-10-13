-- Batch 2 features (2026-10-05):
--   * age-band field on patients (child 6-9 / teen 10-17)
--   * consent & assent records
--   * per-record audit log (trigger-written, no client access)
--   * controlled clinician linking via invite codes
--   * patient data deletion (owner-authorized, audited)
-- Idempotent. Apply after 20261005000008_batch1_features.sql.

-- 1) Age band
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS age_band TEXT CHECK (age_band IN ('child','teen'));

-- 2) Consent & assent records
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,
  guardian_name TEXT,
  guardian_consent BOOLEAN NOT NULL DEFAULT false,
  child_assent BOOLEAN NOT NULL DEFAULT false,
  guardian_consent_at TIMESTAMPTZ,
  child_assent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.consents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.consents TO authenticated;

DROP POLICY IF EXISTS "Users manage own consents" ON public.consents;
CREATE POLICY "Users manage own consents" ON public.consents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Clinicians read patient consents" ON public.consents;
CREATE POLICY "Clinicians read patient consents" ON public.consents FOR SELECT
  USING (patient_id IS NOT NULL AND public.is_assigned_clinician(patient_id));

-- 3) Audit log (trigger-written; no client access, service/admin reads only)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id TEXT,
  details JSONB
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audit_log FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.write_audit_log() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row_id text;
  v_details jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN v_row_id := OLD.id::text; ELSE v_row_id := NEW.id::text; END IF;

  IF TG_TABLE_NAME = 'insulin_regimens' THEN
    v_details := jsonb_build_object(
      'approved_by_clinician', NEW.approved_by_clinician,
      'approved_by', NEW.approved_by,
      'tdd', NEW.tdd,
      'correction_target', NEW.correction_target,
      'max_bolus', NEW.max_bolus
    );
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_details := jsonb_build_object('role_old', OLD.role, 'role_new', NEW.role);
  ELSIF TG_OP = 'INSERT' THEN
    v_details := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_details := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_log (actor, action, table_name, row_id, details)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, v_row_id, v_details);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;

REVOKE ALL ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_insulin_regimens ON public.insulin_regimens;
CREATE TRIGGER audit_insulin_regimens AFTER INSERT OR UPDATE ON public.insulin_regimens
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS audit_care_team ON public.care_team;
CREATE TRIGGER audit_care_team AFTER INSERT OR UPDATE OR DELETE ON public.care_team
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS audit_consents ON public.consents;
CREATE TRIGGER audit_consents AFTER INSERT OR UPDATE ON public.consents
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS audit_profiles_role ON public.profiles;
CREATE TRIGGER audit_profiles_role AFTER UPDATE ON public.profiles
  FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.write_audit_log();

-- 4) Controlled clinician linking (invite codes)
CREATE TABLE IF NOT EXISTS public.care_team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.care_team_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.care_team_invites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.care_team_invites TO authenticated;

DROP POLICY IF EXISTS "Parents manage invites for own patients" ON public.care_team_invites;
CREATE POLICY "Parents manage invites for own patients" ON public.care_team_invites FOR ALL
  USING (public.is_patient_parent(patient_id))
  WITH CHECK (public.is_patient_parent(patient_id) AND created_by = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS care_team_patient_clinician_uniq
  ON public.care_team (patient_id, clinician_id);

CREATE OR REPLACE FUNCTION public.redeem_care_team_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite record;
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE user_id = auth.uid();
  IF v_role IS DISTINCT FROM 'clinician' THEN
    RAISE EXCEPTION 'Only clinician accounts can redeem care-team invites';
  END IF;

  SELECT * INTO v_invite FROM public.care_team_invites
    WHERE code = upper(trim(p_code))
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite code not found'; END IF;
  IF v_invite.used_at IS NOT NULL THEN RAISE EXCEPTION 'Invite already used'; END IF;
  IF v_invite.expires_at < now() THEN RAISE EXCEPTION 'Invite expired'; END IF;

  INSERT INTO public.care_team (patient_id, clinician_id, role)
    VALUES (v_invite.patient_id, auth.uid(), 'primary')
    ON CONFLICT (patient_id, clinician_id) DO NOTHING;

  UPDATE public.care_team_invites
    SET used_at = now(), used_by = auth.uid()
    WHERE id = v_invite.id;

  RETURN v_invite.patient_id;
END; $$;

REVOKE ALL ON FUNCTION public.redeem_care_team_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_care_team_invite(text) TO authenticated;

-- 5) Patient data deletion (owner-authorized, audited)
CREATE OR REPLACE FUNCTION public.delete_patient_data(p_patient_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_patient_parent(p_patient_id) THEN
    RAISE EXCEPTION 'Not authorized to delete this patient record';
  END IF;

  INSERT INTO public.audit_log (actor, action, table_name, row_id, details)
  VALUES (auth.uid(), 'DELETE_PATIENT_DATA', 'patients', p_patient_id::text,
          jsonb_build_object('requested_by', auth.uid()));

  DELETE FROM public.patients WHERE id = p_patient_id;
END; $$;

REVOKE ALL ON FUNCTION public.delete_patient_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_patient_data(uuid) TO authenticated;
