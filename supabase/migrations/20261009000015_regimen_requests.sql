-- Round 9 (2026-10-09): family regimen review requests + clinician/staff regimen insert rights.
-- Families can request a regimen review/change; clinicians and staff see the requests in the
-- clinician view and resolve them when they review/update the regimen. Additive, forward-only.

-- 1) regimen_requests table
CREATE TABLE IF NOT EXISTS public.regimen_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'review' CHECK (kind IN ('review','change')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.regimen_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS regimen_requests_patient_status_idx
  ON public.regimen_requests (patient_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON TABLE public.regimen_requests TO authenticated;

-- 2) Policies: parents (own), clinicians (assigned), admins (all)
DROP POLICY IF EXISTS "Parents can view own regimen requests" ON public.regimen_requests;
CREATE POLICY "Parents can view own regimen requests" ON public.regimen_requests
  FOR SELECT USING (public.is_patient_parent(patient_id));

DROP POLICY IF EXISTS "Parents can create own regimen requests" ON public.regimen_requests;
CREATE POLICY "Parents can create own regimen requests" ON public.regimen_requests
  FOR INSERT WITH CHECK (public.is_patient_parent(patient_id) AND requested_by = auth.uid());

DROP POLICY IF EXISTS "Clinicians can view assigned regimen requests" ON public.regimen_requests;
CREATE POLICY "Clinicians can view assigned regimen requests" ON public.regimen_requests
  FOR SELECT USING (public.is_assigned_clinician(patient_id));

DROP POLICY IF EXISTS "Clinicians can resolve assigned regimen requests" ON public.regimen_requests;
CREATE POLICY "Clinicians can resolve assigned regimen requests" ON public.regimen_requests
  FOR UPDATE USING (public.is_assigned_clinician(patient_id))
  WITH CHECK (status IN ('resolved','declined'));

DROP POLICY IF EXISTS "Admins can view all regimen requests" ON public.regimen_requests;
CREATE POLICY "Admins can view all regimen requests" ON public.regimen_requests
  FOR SELECT USING (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all regimen requests" ON public.regimen_requests;
CREATE POLICY "Admins can update all regimen requests" ON public.regimen_requests
  FOR UPDATE USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

-- 3) insulin_regimens INSERT policies (clinicians/staff could not create regimens before)
DROP POLICY IF EXISTS "Clinicians can create approved regimens" ON public.insulin_regimens;
CREATE POLICY "Clinicians can create approved regimens" ON public.insulin_regimens
  FOR INSERT WITH CHECK (
    approved_by_clinician = true
    AND approved_by = auth.uid()
    AND public.is_assigned_clinician(patient_id)
  );

DROP POLICY IF EXISTS "Admins can insert regimens" ON public.insulin_regimens;
CREATE POLICY "Admins can insert regimens" ON public.insulin_regimens
  FOR INSERT WITH CHECK (public.is_app_admin(auth.uid()));
