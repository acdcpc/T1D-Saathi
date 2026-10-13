-- Round 8 (2026-10-08): bolus (rapid-acting) dose — completes the dual-insulin
-- basal + bolus model introduced in 20261006000013_dual_insulin.sql.
-- The regimen/patient screens capture a basal dose but not the rapid-acting (bolus)
-- daily dose; both are needed to describe a full MDI regimen and to let owners
-- compare basal + bolus against the clinician-set TDD.
-- Additive and nullable; existing rows keep bolus_dose = NULL. Forward-only.

ALTER TABLE public.insulin_regimens
  ADD COLUMN IF NOT EXISTS bolus_dose numeric;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS bolus_dose numeric;
