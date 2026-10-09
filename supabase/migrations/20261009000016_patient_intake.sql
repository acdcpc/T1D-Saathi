-- Round 12: patient intake — weight/height + approximate age & diagnosis precision.
-- Additive and nullable; safe for the currently installed build (columns unused by it).

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS dob_precision TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS diagnosis_precision TEXT;

COMMENT ON COLUMN public.patients.weight_kg IS 'Child weight in kg (required at intake; used for clinical decisions).';
COMMENT ON COLUMN public.patients.height_cm IS 'Child height in cm (optional).';
COMMENT ON COLUMN public.patients.dob_precision IS 'exact | approx_years — whether date_of_birth is exact or estimated from age-in-years.';
COMMENT ON COLUMN public.patients.diagnosis_precision IS 'exact | lt_month | lt_year | gt_year | unknown — how well the diabetes diagnosis date is known.';
