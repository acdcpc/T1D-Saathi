-- Round 6 (2026-10-06): dual-insulin regimen fields — basal (long-acting) + bolus (rapid-acting).
-- Rationale: ISPAD standard MDI basal-bolus therapy; the previous single insulin_type column
-- could not represent a patient using BOTH a long-acting and a rapid-acting insulin.
-- Forward-only migration; legacy insulin_type retained as fallback label.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS basal_insulin TEXT,
  ADD COLUMN IF NOT EXISTS bolus_insulin TEXT;

ALTER TABLE public.insulin_regimens
  ADD COLUMN IF NOT EXISTS regimen_type TEXT DEFAULT 'mdi',
  ADD COLUMN IF NOT EXISTS basal_insulin TEXT,
  ADD COLUMN IF NOT EXISTS basal_dose NUMERIC,
  ADD COLUMN IF NOT EXISTS bolus_insulin TEXT;

DO $$ BEGIN
  BEGIN
    ALTER TABLE public.insulin_regimens
      ADD CONSTRAINT insulin_regimens_regimen_type_chk CHECK (regimen_type IN ('mdi','pump','premix'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
