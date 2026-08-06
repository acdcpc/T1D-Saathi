export type Language = 'en' | 'ne';
export type UnitSystem = 'mgdl' | 'mmol';

export interface PatientProfile {
  id: string; user_id: string; name: string; date_of_birth: string;
  sex: 'male' | 'female' | 'other'; photo_uri?: string;
  comorbid_conditions?: string[]; medications?: string;
  insulin_type: string; insulin_dose: number; insulin_frequency: string;
  insulin_delivery: 'pen' | 'syringe' | 'pump'; diagnosis_date: string;
  dka_history?: DKAHistoryEntry[]; documents?: string[];
  created_at: string; updated_at: string;
}
export interface DKAHistoryEntry { date: string; description: string; }
export interface InsulinRegimen {
  id: string; patient_id: string; insulin_type: string; dose: number;
  frequency: string; delivery_method: 'pen' | 'syringe' | 'pump';
  effective_date: string; isf?: number; carb_ratio?: number; tdd?: number;
  correction_target?: number;
}
export interface GlucoseLog {
  id: string; patient_id: string; user_id: string; value: number;
  unit: UnitSystem; context: 'routine' | 'sick_day'; timestamp: string;
  carbs?: number; insulin_given?: number; notes?: string;
}
export interface KetoneLog {
  id: string; patient_id: string; user_id: string; value?: number;
  method: 'blood' | 'urine' | 'unknown'; timestamp: string; episode_id?: string;
}
export interface SickDayEpisode {
  id: string; patient_id: string; user_id: string; start_date: string;
  end_date?: string; symptoms: SickDaySymptoms; outcome?: string; escalated: boolean;
}
export interface SickDaySymptoms {
  glucose?: number; fever: boolean; vomiting: boolean; diarrhea: boolean;
  ketone_value?: number; ketone_method?: 'blood' | 'urine' | 'unknown';
}
export interface CareTeam {
  id: string; patient_id: string; clinician_id: string;
  hospital_id: string; role: 'primary' | 'secondary';
}
export interface Hospital { id: string; name: string; address: string; phone: string; region: string; latitude?: number; longitude?: number; source?: string; }
export interface SickDayRule {
  id: string; ketone_min?: number; ketone_max?: number; urine_ketone?: string;
  glucose_min?: number; glucose_max?: number; guidance_key: string;
  severity: 'green' | 'yellow' | 'orange' | 'red';
  supplemental_insulin_percent?: number; supplemental_insulin_weight?: number;
  monitoring_glucose_minutes: number; monitoring_ketone_minutes: number;
  escalate: boolean;
}
export interface ChatThread { id: string; patient_id: string; clinician_id: string; parent_id: string; created_at: string; }
export interface Message {
  id: string; thread_id: string; sender_id: string; recipient_id: string;
  body: string; related_log_id?: string; timestamp: string;
}
export type UserRole = 'parent' | 'clinician';
