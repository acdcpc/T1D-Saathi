-- Idempotency keys for offline-first health records.
ALTER TABLE public.glucose_logs ADD COLUMN IF NOT EXISTS client_event_id TEXT;
ALTER TABLE public.ketone_logs ADD COLUMN IF NOT EXISTS client_event_id TEXT;
ALTER TABLE public.sick_day_episodes ADD COLUMN IF NOT EXISTS client_event_id TEXT;
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS client_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS glucose_logs_client_event_id_idx ON public.glucose_logs (client_event_id) WHERE client_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ketone_logs_client_event_id_idx ON public.ketone_logs (client_event_id) WHERE client_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sick_day_episodes_client_event_id_idx ON public.sick_day_episodes (client_event_id) WHERE client_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meal_logs_client_event_id_idx ON public.meal_logs (client_event_id) WHERE client_event_id IS NOT NULL;
