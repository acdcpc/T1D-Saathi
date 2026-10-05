-- Batch 4 fix (2026-10-05): the app's patient queries reference `patients.documents`
-- but the column was never created on the live project, so the Home patient list
-- silently failed (query error 42703) and always showed the empty state.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS documents TEXT[];
