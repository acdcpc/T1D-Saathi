// ISPAD Sick Day Management Rules (Phelan et al., Pediatric Diabetes 2022)
// These thresholds are the clinical source of truth.
// All values in mg/dL for glucose, mmol/L for blood ketones.

import type { SickDayRule } from '../types';

export const DEFAULT_SICK_DAY_RULES: SickDayRule[] = [
  {
    id: 'rule-1',
    ketone_min: undefined,
    ketone_max: 0.6,
    urine_ketone: 'negative',
    guidance_key: 'noExtraInsulin',
    severity: 'green',
    monitoring_glucose_minutes: 120,
    monitoring_ketone_minutes: 240,
    escalate: false,
  },
  {
    id: 'rule-1b',
    ketone_min: undefined,
    ketone_max: 0.6,
    urine_ketone: 'negative',
    glucose_max: 70,
    guidance_key: 'hypoCorrection',
    severity: 'green',
    monitoring_glucose_minutes: 60,
    monitoring_ketone_minutes: 240,
    escalate: false,
  },
  {
    id: 'rule-2',
    ketone_min: 0.6,
    ketone_max: 1.0,
    urine_ketone: 'trace',
    guidance_key: 'mildKetones',
    severity: 'yellow',
    supplemental_insulin_percent: -15,
    monitoring_glucose_minutes: 120,
    monitoring_ketone_minutes: 240,
    escalate: false,
  },
  {
    id: 'rule-3',
    ketone_min: 1.0,
    ketone_max: 3.0,
    urine_ketone: 'small',
    guidance_key: 'moderateKetones',
    severity: 'orange',
    supplemental_insulin_percent: 10,
    supplemental_insulin_weight: 0.1,
    monitoring_glucose_minutes: 60,
    monitoring_ketone_minutes: 120,
    escalate: false,
  },
  {
    id: 'rule-4',
    ketone_min: 3.0,
    ketone_max: undefined,
    urine_ketone: 'large',
    guidance_key: 'severeKetones',
    severity: 'red',
    monitoring_glucose_minutes: 30,
    monitoring_ketone_minutes: 60,
    escalate: true,
  },
];

// Escalation red-flag triggers (checked independently)
export const RED_FLAG_TRIGGERS = {
  ketonesHigh: { ketone_min: 3.0, label: 'ketonesHigh' },
  persistentVomiting: { symptom: 'vomiting', label: 'persistentVomiting' },
  feverPersists: { symptom: 'fever', label: 'feverPersists' },
  childUnder5: { age_max: 5, label: 'childUnder5' },
  glucoseBelow70: { glucose_max: 70, label: 'glucoseBelow70' },
} as const;

// Mini-dose glucagon reference (for clinician-guided use only)
export const GLUCAGON_DOSE_TABLE = [
  { ageLabel: 'underTwo', ageMin: 0, ageMax: 2, doseMg: 0.02, doseUnits: 2 },
  { ageLabel: 'twoTo15', ageMin: 2, ageMax: 15, doseMgPerYear: 0.01, doseUnitsPerYear: 1 },
  { ageLabel: 'over15', ageMin: 15, ageMax: 999, doseMg: 0.15, doseUnits: 15 },
];

// Hydration: carb fluids if glucose < 250 mg/dL
export const HYDRATION_THRESHOLD = 250;

// Hypoglycemia threshold: 70 mg/dL
export const HYPO_THRESHOLD = 70;

// Hypoglycemia recheck interval in minutes
export const HYPO_RECHECK_MINUTES = 20;

// ISPAD monitoring guidance
export function getMonitoringGuidance(ketoneValue: number): {
  glucoseMinutes: number;
  ketoneMinutes: number;
} {
  if (ketoneValue >= 3.0) return { glucoseMinutes: 60, ketoneMinutes: 60 };
  if (ketoneValue >= 1.0) return { glucoseMinutes: 60, ketoneMinutes: 120 };
  return { glucoseMinutes: 120, ketoneMinutes: 240 };
}

// Find matching rule for given ketone value
export function findSickDayRule(ketoneValue?: number, urineKetone?: string): SickDayRule | null {
  if (ketoneValue === undefined && !urineKetone) return null;

  for (const rule of DEFAULT_SICK_DAY_RULES) {
    // Check blood ketone match
    if (ketoneValue !== undefined) {
      const minOk = rule.ketone_min === undefined || ketoneValue >= rule.ketone_min;
      const maxOk = rule.ketone_max === undefined || ketoneValue < rule.ketone_max;
      if (minOk && maxOk) return rule;
    }

    // Check urine ketone match
    if (urineKetone && rule.urine_ketone === urineKetone) {
      return rule;
    }
  }

  // Default: worst case
  return DEFAULT_SICK_DAY_RULES[DEFAULT_SICK_DAY_RULES.length - 1];
}

// Calculate correction dose using 1800 rule (configurable)
export function calculateCorrectionDose(
  currentGlucose: number,
  targetGlucose: number,
  tdd: number,
  isf?: number
): number {
  if (currentGlucose <= targetGlucose) return 0;
  const factor = isf || (1800 / tdd);
  return Math.max(0, (currentGlucose - targetGlucose) / factor);
}

// Calculate carb dose using 500 rule (configurable)
export function calculateCarbDose(carbs: number, carbRatio?: number, tdd?: number): number {
  if (!carbs || carbs <= 0) return 0;
  const ratio = carbRatio || (tdd ? 500 / tdd : 10);
  return carbs / ratio;
}

// Convert glucose between units
export function convertGlucose(value: number, from: 'mgdl' | 'mmol', to: 'mgdl' | 'mmol'): number {
  if (from === to) return value;
  if (from === 'mgdl' && to === 'mmol') return Math.round((value / 18.018) * 10) / 10;
  return Math.round(value * 18.018);
}
