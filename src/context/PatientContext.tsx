import { createContext, useContext } from 'react';
import type { PatientProfile } from '../types';

/** Active patient for patient-scoped bottom tabs. */
const PatientContext = createContext<PatientProfile | null>(null);

export const PatientProvider = PatientContext.Provider;

export function usePatient(): PatientProfile | null {
  return useContext(PatientContext);
}
