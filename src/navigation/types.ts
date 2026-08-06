import type { PatientProfile } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type ParentStackParamList = {
  Home: undefined;
  AddPatient: { patientId?: string };
  PatientDashboard: { patient: PatientProfile };
  LogGlucose: { patientId: string };
  SickDayWizard: { patientId: string };
  FoodEstimator: { patientId: string };
  HealthCenters: { patientId?: string };
  Helpline: undefined;
  Education: { patientId: string };
  Quiz: { patientId: string; phase: 'pre' | 'post'; questionnaireId?: string };
  Messages: { patientId: string; threadId?: string };
  Emergency: { patientId: string };
  Settings: undefined;
  RegimenSettings: { patientId: string };
};

export type ClinicianStackParamList = {
  ClinicianPatientList: undefined;
  ClinicianPatientDetail: { patientId: string; patientName: string };
  ClinicianChat: { patientId: string; threadId: string };
  HealthCenters: { patientId?: string };
};
