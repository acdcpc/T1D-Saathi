-- RLS helper catch-up (2026-10-05)
-- Brings the live project in line with the repository's hardened RLS state.
--
-- Context: migration 20260812000005 (fix_rls_recursion) was never applied to the
-- live project, and some policies created later still use direct cross-table
-- EXISTS subqueries that can trigger "infinite recursion" during policy checks.
-- This migration:
--   1. (re)creates the SECURITY DEFINER helpers used by the hardened policies,
--   2. rewrites the remaining cross-table policies to use those helpers,
--   3. adds a helper for the messages sender/recipient care-team check.
--
-- Idempotent: safe to re-run. Live application order used: 09 -> 000007 -> 000008.

-- 1) Helpers (same definitions as 20260812000005)
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

GRANT EXECUTE ON FUNCTION public.is_assigned_clinician(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_assigned_clinician(uuid) FROM PUBLIC, anon;

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

GRANT EXECUTE ON FUNCTION public.is_patient_parent(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_patient_parent(uuid) FROM PUBLIC, anon;

-- Generic care-team membership check (for messages sender/recipient policies).
CREATE OR REPLACE FUNCTION public.is_care_team_clinician(p_patient_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_team
    WHERE care_team.patient_id = p_patient_id
      AND care_team.clinician_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_care_team_clinician(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_care_team_clinician(uuid, uuid) FROM PUBLIC, anon;

-- 2) Patients: clinician read
DROP POLICY IF EXISTS "Clinicians can read assigned patients" ON public.patients;
CREATE POLICY "Clinicians can read assigned patients" ON public.patients
  FOR SELECT USING (public.is_assigned_clinician(patients.id));

-- 3) Logs / episodes / assessments: clinician read
DROP POLICY IF EXISTS "Clinicians can read glucose logs" ON public.glucose_logs;
CREATE POLICY "Clinicians can read glucose logs" ON public.glucose_logs
  FOR SELECT USING (public.is_assigned_clinician(glucose_logs.patient_id));

DROP POLICY IF EXISTS "Clinicians can read ketone logs" ON public.ketone_logs;
CREATE POLICY "Clinicians can read ketone logs" ON public.ketone_logs
  FOR SELECT USING (public.is_assigned_clinician(ketone_logs.patient_id));

DROP POLICY IF EXISTS "Clinicians can read episodes" ON public.sick_day_episodes;
CREATE POLICY "Clinicians can read episodes" ON public.sick_day_episodes
  FOR SELECT USING (public.is_assigned_clinician(sick_day_episodes.patient_id));

DROP POLICY IF EXISTS "Clinicians can read assessment" ON public.assessment_responses;
CREATE POLICY "Clinicians can read assessment" ON public.assessment_responses
  FOR SELECT USING (public.is_assigned_clinician(assessment_responses.patient_id));

DROP POLICY IF EXISTS "Clinicians can read meal logs" ON public.meal_logs;
CREATE POLICY "Clinicians can read meal logs" ON public.meal_logs
  FOR SELECT USING (public.is_assigned_clinician(meal_logs.patient_id));

-- 4) Insulin regimens
DROP POLICY IF EXISTS "Clinicians can read assigned regimens" ON public.insulin_regimens;
CREATE POLICY "Clinicians can read assigned regimens" ON public.insulin_regimens
  FOR SELECT USING (public.is_assigned_clinician(insulin_regimens.patient_id));

DROP POLICY IF EXISTS "Clinicians can approve assigned regimens" ON public.insulin_regimens;
CREATE POLICY "Clinicians can approve assigned regimens" ON public.insulin_regimens
  FOR UPDATE
  USING (public.is_assigned_clinician(insulin_regimens.patient_id))
  WITH CHECK (
    approved_by_clinician = true
    AND approved_by = auth.uid()
    AND public.is_assigned_clinician(insulin_regimens.patient_id)
  );

DROP POLICY IF EXISTS "Parents can read own regimens" ON public.insulin_regimens;
CREATE POLICY "Parents can read own regimens" ON public.insulin_regimens
  FOR SELECT USING (public.is_patient_parent(insulin_regimens.patient_id));

DROP POLICY IF EXISTS "Parents can create unapproved regimens" ON public.insulin_regimens;
CREATE POLICY "Parents can create unapproved regimens" ON public.insulin_regimens
  FOR INSERT WITH CHECK (
    approved_by_clinician = false
    AND public.is_patient_parent(insulin_regimens.patient_id)
  );

DROP POLICY IF EXISTS "Parents can update unapproved regimens" ON public.insulin_regimens;
CREATE POLICY "Parents can update unapproved regimens" ON public.insulin_regimens
  FOR UPDATE
  USING (approved_by_clinician = false AND public.is_patient_parent(insulin_regimens.patient_id))
  WITH CHECK (approved_by_clinician = false AND public.is_patient_parent(insulin_regimens.patient_id));

-- 5) Dosing settings
DROP POLICY IF EXISTS "Clinicians can manage dosing" ON public.dosing_settings;
CREATE POLICY "Clinicians can manage dosing" ON public.dosing_settings
  FOR ALL USING (public.is_assigned_clinician(dosing_settings.patient_id));

DROP POLICY IF EXISTS "Parents can read dosing" ON public.dosing_settings;
CREATE POLICY "Parents can read dosing" ON public.dosing_settings
  FOR SELECT USING (public.is_patient_parent(dosing_settings.patient_id));

-- 6) Messages: sender/recipient care-team check without recursion
DROP POLICY IF EXISTS "Users can send related messages" ON public.messages;
CREATE POLICY "Users can send related messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND patient_id IS NOT NULL
    AND (
      public.is_care_team_clinician(messages.patient_id, auth.uid())
      OR public.is_care_team_clinician(messages.patient_id, messages.recipient_id)
    )
  );

-- 7) Keep trigger-only functions off the RPC surface (Security Advisor 0028/0029)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_role_change() FROM PUBLIC, anon, authenticated;
