-- RLS Policies for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE insulin_regimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sick_day_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ketone_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can manage own patients" ON patients USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read assigned patients" ON patients FOR SELECT USING (EXISTS (SELECT 1 FROM care_team WHERE care_team.patient_id = patients.id AND care_team.clinician_id = auth.uid()));

CREATE POLICY "Parents can manage regimens" ON insulin_regimens USING (EXISTS (SELECT 1 FROM patients WHERE patients.id = insulin_regimens.patient_id AND patients.user_id = auth.uid()));
CREATE POLICY "Clinicians can read regimens" ON insulin_regimens FOR SELECT USING (EXISTS (SELECT 1 FROM care_team JOIN patients p ON p.id = insulin_regimens.patient_id WHERE care_team.patient_id = p.id AND care_team.clinician_id = auth.uid()));

CREATE POLICY "Parents can manage episodes" ON sick_day_episodes USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read episodes" ON sick_day_episodes FOR SELECT USING (EXISTS (SELECT 1 FROM care_team WHERE care_team.patient_id = sick_day_episodes.patient_id AND care_team.clinician_id = auth.uid()));

CREATE POLICY "Parents can manage glucose logs" ON glucose_logs USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read glucose logs" ON glucose_logs FOR SELECT USING (EXISTS (SELECT 1 FROM care_team WHERE care_team.patient_id = glucose_logs.patient_id AND care_team.clinician_id = auth.uid()));

CREATE POLICY "Parents can manage ketone logs" ON ketone_logs USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read ketone logs" ON ketone_logs FOR SELECT USING (EXISTS (SELECT 1 FROM care_team WHERE care_team.patient_id = ketone_logs.patient_id AND care_team.clinician_id = auth.uid()));

CREATE POLICY "Anyone can read hospitals" ON hospitals FOR SELECT USING (true);

CREATE POLICY "Parents can view care team" ON care_team FOR SELECT USING (EXISTS (SELECT 1 FROM patients WHERE patients.id = care_team.patient_id AND patients.user_id = auth.uid()));
CREATE POLICY "Clinicians can view own assignments" ON care_team FOR SELECT USING (clinician_id = auth.uid());

CREATE POLICY "Users can send/receive messages" ON messages USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Anyone can read education" ON education_content FOR SELECT USING (true);

CREATE POLICY "Parents can manage assessment" ON assessment_responses USING (auth.uid() = user_id);
CREATE POLICY "Clinicians can read assessment" ON assessment_responses FOR SELECT USING (EXISTS (SELECT 1 FROM care_team WHERE care_team.patient_id = assessment_responses.patient_id AND care_team.clinician_id = auth.uid()));
