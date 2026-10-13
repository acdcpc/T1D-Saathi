-- Batch 1 feature expansion (2026-10-05):
--   * diary enrichment: glucose source, mood/feeling, activity
--   * clinician-set maximum bolus for high-dose warning
--   * dedicated insulin dose log (rapid / long-acting) with offline idempotency
-- Apply AFTER 20260821000007_audit_hardening.sql. Idempotent.

-- 1) Diary enrichment on glucose logs
ALTER TABLE public.glucose_logs
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS mood TEXT,
  ADD COLUMN IF NOT EXISTS activity_type TEXT,
  ADD COLUMN IF NOT EXISTS activity_minutes NUMERIC;

-- 2) Clinician-set maximum bolus (used to warn/block unusually large doses)
ALTER TABLE public.insulin_regimens
  ADD COLUMN IF NOT EXISTS max_bolus NUMERIC;

-- 3) Dedicated insulin dose diary
CREATE TABLE IF NOT EXISTS public.insulin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  units NUMERIC NOT NULL CHECK (units > 0 AND units <= 200),
  insulin_type TEXT NOT NULL DEFAULT 'rapid' CHECK (insulin_type IN ('rapid','long','mixed','other')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','food_estimator','sick_day','other')),
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  client_event_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS insulin_logs_client_event_id_idx
  ON public.insulin_logs (client_event_id) WHERE client_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS insulin_logs_patient_timestamp_idx
  ON public.insulin_logs (patient_id, timestamp DESC);

ALTER TABLE public.insulin_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.insulin_logs FROM anon;
REVOKE ALL ON TABLE public.insulin_logs FROM authenticated;

DROP POLICY IF EXISTS "Parents can manage own insulin logs" ON public.insulin_logs;
CREATE POLICY "Parents can manage own insulin logs"
  ON public.insulin_logs FOR ALL
  USING (auth.uid() = user_id AND public.is_patient_parent(patient_id))
  WITH CHECK (auth.uid() = user_id AND public.is_patient_parent(patient_id));

DROP POLICY IF EXISTS "Clinicians can read assigned insulin logs" ON public.insulin_logs;
CREATE POLICY "Clinicians can read assigned insulin logs"
  ON public.insulin_logs FOR SELECT
  USING (public.is_assigned_clinician(patient_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.insulin_logs TO authenticated;
