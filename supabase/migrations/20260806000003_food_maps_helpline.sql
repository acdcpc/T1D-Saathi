-- 3.7: Food Photo Macro Estimator tables
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  photo_url TEXT,
  foods JSONB,
  carbs_g NUMERIC,
  protein_g NUMERIC,
  fat_g NUMERIC,
  calories NUMERIC,
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('high','medium','low')),
  confirmed_by_user BOOLEAN DEFAULT false,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage meal logs" ON meal_logs USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read meal logs" ON meal_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM care_team WHERE care_team.patient_id = meal_logs.patient_id AND care_team.clinician_id = auth.uid())
);

-- Dosing settings (ICR/ISF per patient, clinician-approved)
CREATE TABLE IF NOT EXISTS dosing_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  icr NUMERIC,
  icr_rule_constant INTEGER DEFAULT 500,
  isf NUMERIC,
  isf_rule_constant INTEGER DEFAULT 1800,
  correction_target NUMERIC DEFAULT 120,
  approved_by_clinician BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dosing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can read dosing" ON dosing_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = dosing_settings.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Clinicians can manage dosing" ON dosing_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM care_team WHERE care_team.patient_id = dosing_settings.patient_id AND care_team.clinician_id = auth.uid())
);

-- 3.8: Extend hospitals for health center map
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manually_added' CHECK (source IN ('google_places','manually_added'));

-- 3.9: Helplines table
CREATE TABLE IF NOT EXISTS helplines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role_en TEXT,
  role_ne TEXT,
  phone TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE helplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read helplines" ON helplines FOR SELECT USING (true);

-- Seed the primary helpline
INSERT INTO helplines (name, role_en, role_ne, phone, priority, is_active)
VALUES (
  'Dr. Archana',
  'Pediatric Endocrinologist',
  'बाल मधुमेह विशेषज्ञ',
  '9851350883',
  1,
  true
) ON CONFLICT DO NOTHING;

-- Seed some reference Nepali/South Asian hospitals
INSERT INTO hospitals (name, address, phone, region, latitude, longitude, source) VALUES
  ('Kanti Childrens Hospital', 'Maharajgunj, Kathmandu', '01-4414798', 'Bagmati', 27.7350, 85.3320, 'manually_added'),
  ('Tribhuvan University Teaching Hospital', 'Maharajgunj, Kathmandu', '01-4412303', 'Bagmati', 27.7359, 85.3315, 'manually_added'),
  ('BP Koirala Institute of Health Sciences', 'Dharan, Sunsari', '025-525555', 'Koshi', 26.8120, 87.2830, 'manually_added'),
  ('Patan Academy of Health Sciences', 'Lagankhel, Lalitpur', '01-5522296', 'Bagmati', 27.6693, 85.3233, 'manually_added'),
  ('Pokhara Academy of Health Sciences', 'Ramghat, Pokhara', '061-520066', 'Gandaki', 28.2160, 83.9800, 'manually_added'),
  ('Bheri Hospital', 'Nepalgunj, Banke', '081-520120', 'Lumbini', 28.0500, 81.6167, 'manually_added')
ON CONFLICT DO NOTHING;
