-- Extend meal_logs for photo-first multi-item estimator
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS original_estimate JSONB;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS corrected_estimate JSONB;
