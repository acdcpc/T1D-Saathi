// ISPAD Sick Day Management Rules (Phelan et al., Pediatric Diabetes 2022)
// These thresholds are the clinical source of truth.
// All values in mg/dL for glucose, mmol/L for blood ketones.

import type { SickDayRule } from '../types';
import { MMOL_TO_MGDL } from '../utils/dosingCalc';

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
    // Mild ketones: extra rapid-acting insulin ~5–10% of TDD per common paediatric sick-day plans.
    // Low end (5%) chosen conservatively; clinician to confirm — see CLINICAL_SAFETY_LOG (round 6).
    supplemental_insulin_percent: 5,
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

// Hypoglycemia recheck interval in minutes — aligned with the 15/15 rule (retest after 15 min)
export const HYPO_RECHECK_MINUTES = 15;

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

// Calculate correction dose using the 1800 rule (configurable via clinician-set ISF).
// Fail-closed: invalid or missing inputs yield 0 — never NaN or Infinity.
// A supplied-but-unusable ISF (0, NaN, negative) refuses to compute rather than
// silently falling back to an approximation.
export function calculateCorrectionDose(
  currentGlucose: number,
  targetGlucose: number,
  tdd: number,
  isf?: number
): number {
  if (!Number.isFinite(currentGlucose) || !Number.isFinite(targetGlucose)) return 0;
  if (currentGlucose <= 0 || targetGlucose <= 0) return 0;
  if (currentGlucose <= targetGlucose) return 0;

  let factor: number;
  if (typeof isf === 'number') {
    // ISF supplied — it must be finite and positive to be trusted.
    if (!Number.isFinite(isf) || isf <= 0) return 0;
    factor = isf;
  } else {
    // No ISF supplied — derive from TDD via the 1800 rule when TDD is usable.
    factor = typeof tdd === 'number' && Number.isFinite(tdd) && tdd > 0 ? 1800 / tdd : NaN;
  }
  if (!Number.isFinite(factor) || factor <= 0) return 0;

  const dose = (currentGlucose - targetGlucose) / factor;
  return Number.isFinite(dose) && dose > 0 ? dose : 0;
}

// Calculate carb dose using the 500 rule (configurable via clinician-set I:C ratio).
// Fail-closed: invalid or missing inputs yield 0 — never NaN or Infinity.
// There is no default ratio: without a clinician-set ratio or a usable TDD the
// dose is 0, not a guess (previously silently assumed 1:10).
export function calculateCarbDose(carbs: number, carbRatio?: number, tdd?: number): number {
  if (!Number.isFinite(carbs) || carbs <= 0) return 0;

  let ratio: number;
  if (typeof carbRatio === 'number') {
    // I:C ratio supplied — it must be finite and positive to be trusted.
    if (!Number.isFinite(carbRatio) || carbRatio <= 0) return 0;
    ratio = carbRatio;
  } else if (typeof tdd === 'number' && Number.isFinite(tdd) && tdd > 0) {
    // No ratio supplied — derive from TDD via the 500 rule.
    ratio = 500 / tdd;
  } else {
    return 0;
  }
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;

  const dose = carbs / ratio;
  return Number.isFinite(dose) && dose > 0 ? dose : 0;
}

// Convert glucose between units
export function convertGlucose(value: number, from: 'mgdl' | 'mmol', to: 'mgdl' | 'mmol'): number {
  if (from === to) return value;
  if (from === 'mgdl' && to === 'mmol') return Math.round((value / MMOL_TO_MGDL) * 10) / 10;
  return Math.round(value * MMOL_TO_MGDL);
}
