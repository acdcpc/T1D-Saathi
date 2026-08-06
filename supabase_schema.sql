-- T1D Saathi - Supabase Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'parent' CHECK (role IN ('parent', 'clinician')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  date_of_birth TEXT,
  sex TEXT CHECK (sex IN ('male', 'female', 'other')),
  photo_uri TEXT,
  comorbid_conditions TEXT[],
  medications TEXT,
  insulin_type TEXT NOT NULL,
  insulin_dose NUMERIC DEFAULT 0,
  insulin_frequency TEXT,
  insulin_delivery TEXT CHECK (insulin_delivery IN ('pen', 'syringe', 'pump')),
  diagnosis_date TEXT,
  dka_history JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage own patients" ON patients USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read assigned patients" ON patients FOR SELECT USING (
  EXISTS (SELECT 1 FROM care_team WHERE care_team.patient_id = patients.id AND care_team.clinician_id = auth.uid())
);

-- Insulin Regimens
CREATE TABLE insulin_regimens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  insulin_type TEXT NOT NULL,
  dose NUMERIC DEFAULT 0,
  frequency TEXT,
  delivery_method TEXT CHECK (delivery_method IN ('pen', 'syringe', 'pump')),
  isf NUMERIC,
  carb_ratio NUMERIC,
  tdd NUMERIC,
  correction_target NUMERIC DEFAULT 120,
  effective_date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE insulin_regimens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage regimens" ON insulin_regimens USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = insulin_regimens.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Clinicians can read regimens" ON insulin_regimens FOR SELECT USING (
  EXISTS (SELECT 1 FROM care_team ct JOIN patients p ON p.id = insulin_regimens.patient_id WHERE ct.patient_id = p.id AND ct.clinician_id = auth.uid())
);

-- Glucose Logs
CREATE TABLE glucose_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT DEFAULT 'mgdl' CHECK (unit IN ('mgdl', 'mmol')),
  context TEXT DEFAULT 'routine' CHECK (context IN ('routine', 'sick_day')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  carbs NUMERIC,
  insulin_given NUMERIC,
  notes TEXT
);

ALTER TABLE glucose_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage glucose logs" ON glucose_logs USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read glucose logs" ON glucose_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM care_team ct WHERE ct.patient_id = glucose_logs.patient_id AND ct.clinician_id = auth.uid())
);

-- Ketone Logs
CREATE TABLE ketone_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  value NUMERIC,
  method TEXT DEFAULT 'blood' CHECK (method IN ('blood', 'urine', 'unknown')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  episode_id UUID REFERENCES sick_day_episodes(id)
);

ALTER TABLE ketone_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage ketone logs" ON ketone_logs USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read ketone logs" ON ketone_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM care_team ct WHERE ct.patient_id = ketone_logs.patient_id AND ct.clinician_id = auth.uid())
);

-- Sick Day Episodes
CREATE TABLE sick_day_episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  symptoms JSONB,
  outcome TEXT,
  escalated BOOLEAN DEFAULT false
);

ALTER TABLE sick_day_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage episodes" ON sick_day_episodes USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read episodes" ON sick_day_episodes FOR SELECT USING (
  EXISTS (SELECT 1 FROM care_team ct WHERE ct.patient_id = sick_day_episodes.patient_id AND ct.clinician_id = auth.uid())
);

-- Hospitals
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  region TEXT
);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read hospitals" ON hospitals FOR SELECT USING (true);

-- Care Team (links patients to clinicians and hospitals)
CREATE TABLE care_team (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  clinician_id UUID REFERENCES auth.users(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id),
  role TEXT DEFAULT 'primary' CHECK (role IN ('primary', 'secondary'))
);

ALTER TABLE care_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can view care team" ON care_team FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = care_team.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Clinicians can view own assignments" ON care_team FOR SELECT USING (clinician_id = auth.uid());

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  recipient_id UUID REFERENCES auth.users(id),
  body TEXT NOT NULL,
  related_log_id UUID,
  is_structured_advice BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can send/receive messages" ON messages USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Education Content
CREATE TABLE education_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ne')),
  media_url TEXT,
  thumbnail_url TEXT,
  "order" INTEGER DEFAULT 0,
  target_audience TEXT DEFAULT 'both' CHECK (target_audience IN ('patient', 'family', 'both')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE education_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read education" ON education_content FOR SELECT USING (true);

-- Assessment Responses
CREATE TABLE assessment_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  questionnaire_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('pre', 'post')),
  answers JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage assessment" ON assessment_responses USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read assessment" ON assessment_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM care_team ct WHERE ct.patient_id = assessment_responses.patient_id AND ct.clinician_id = auth.uid())
);

-- Storage buckets
-- Run these in Supabase Dashboard > Storage
-- 1. Create bucket: patient-documents (private, path: {user_id}/{patient_id}/...)
--    RLS: INSERT/SELECT policies for auth.uid() matching

-- Triggers
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
