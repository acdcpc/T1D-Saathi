-- Fix infinite recursion between patients <-> care_team RLS policies.
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
