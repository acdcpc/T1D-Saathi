// Clinical dosing helpers for T1D Saathi.
// These calculations are intentionally fail-closed: callers must provide
// complete, clinician-approved inputs and handle validation errors explicitly.

export type GlucoseUnit = 'mgdl' | 'mmol';

// Single source of truth for unit conversion across the app.
// 1 mmol/L glucose = 18.0182 mg/dL (molecular weight 180.182 g/mol).
export const MMOL_TO_MGDL = 18.0182;

// Max age of a glucose reading that may be used for a correction dose.
// TODO(clinician): confirm this window (currently 15 minutes).
export const DEFAULT_MAX_GLUCOSE_AGE_MS = 15 * 60 * 1000;

export interface DosingParams {
  tdd: number;
  icr_constant?: number;
  isf_constant?: number;
  target_glucose: number;
  approved_by_clinician: boolean;
  regimen_id?: string;
  /** ISO timestamp of when the glucose reading was taken. When provided,
   *  a reading older than DEFAULT_MAX_GLUCOSE_AGE_MS fails closed. */
  glucose_timestamp?: string;
}

export interface DosingResult {
  icr: number;
  isf: number;
  mealBolus: number;
  correctionDose: number;
  totalDose: number;
  target_glucose: number;
  glucose_unit: 'mgdl';
  regimen_id?: string;
}

export class DosingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DosingValidationError';
  }
}

const finitePositive = (value: number) => Number.isFinite(value) && value > 0;

/** Convert a glucose reading to mg/dL for the calculation layer. */
export function glucoseToMgDl(value: number, unit: GlucoseUnit): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DosingValidationError('Glucose must be a positive number.');
  }
  const mgdl = unit === 'mmol' ? value * MMOL_TO_MGDL : value;
  if (mgdl < 20 || mgdl > 1000) {
    throw new DosingValidationError('Glucose reading is outside the supported range.');
  }
  return Math.round(mgdl * 10) / 10;
}

export function mgDlToGlucose(value: number, unit: GlucoseUnit): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DosingValidationError('Glucose must be a positive number.');
  }
  return Math.round((unit === 'mmol' ? value / MMOL_TO_MGDL : value) * 10) / 10;
}

export function calculateDosing(
  currentGlucose: number,
  mealCarbs: number,
  params: DosingParams,
): DosingResult {
  const icrConstant = params.icr_constant ?? 500;
  const isfConstant = params.isf_constant ?? 1800;

  if (!params.approved_by_clinician) {
    throw new DosingValidationError('A clinician-approved regimen is required before calculating a dose.');
  }
  if (!finitePositive(params.tdd) || params.tdd > 500) {
    throw new DosingValidationError('The active total daily dose is missing or invalid.');
  }
  if (!finitePositive(params.target_glucose) || params.target_glucose < 60 || params.target_glucose > 250) {
    throw new DosingValidationError('The approved glucose target is missing or invalid.');
  }
  if (!finitePositive(icrConstant) || !finitePositive(isfConstant)) {
    throw new DosingValidationError('The approved dosing constants are invalid.');
  }
  if (!Number.isFinite(currentGlucose) || currentGlucose < 20 || currentGlucose > 1000) {
    throw new DosingValidationError('A current glucose reading is required for dose calculation.');
  }
  if (params.glucose_timestamp) {
    const ageMs = Date.now() - new Date(params.glucose_timestamp).getTime();
    if (!Number.isFinite(ageMs) || ageMs > DEFAULT_MAX_GLUCOSE_AGE_MS) {
      throw new DosingValidationError('The glucose reading is too old. Take a fresh reading before calculating a dose.');
    }
  }
  if (!Number.isFinite(mealCarbs) || mealCarbs < 0 || mealCarbs > 1000) {
    throw new DosingValidationError('Meal carbohydrates are missing or invalid.');
  }

  const icr = icrConstant / params.tdd;
  const isf = isfConstant / params.tdd;
  const mealBolus = mealCarbs / icr;
  const correctionDose = currentGlucose > params.target_glucose
    ? (currentGlucose - params.target_glucose) / isf
    : 0;

  return {
    icr: Math.round(icr * 10) / 10,
    isf: Math.round(isf * 10) / 10,
    mealBolus: Math.round(mealBolus * 10) / 10,
    correctionDose: Math.round(correctionDose * 10) / 10,
    totalDose: Math.round((mealBolus + correctionDose) * 10) / 10,
    target_glucose: params.target_glucose,
    glucose_unit: 'mgdl',
    regimen_id: params.regimen_id,
  };
}

export interface CoverageCheck {
  covered: boolean;
  message: string | null;
  deficit: number;
  isHighCalorieMeal: boolean;
  highCalorieNote: string | null;
}

export function checkMealCoverage(
  mealCarbs: number,
  mealCalories: number,
  plannedInsulinDose: number,
  icr: number,
): CoverageCheck {
  if (!Number.isFinite(mealCarbs) || mealCarbs < 0 || !Number.isFinite(plannedInsulinDose) || plannedInsulinDose < 0 || !finitePositive(icr)) {
    return { covered: false, message: 'Meal coverage cannot be assessed from incomplete inputs.', deficit: 0, isHighCalorieMeal: false, highCalorieNote: null };
  }

  const carbsCovered = plannedInsulinDose * icr;
  const deficit = mealCarbs - carbsCovered;
  const covered = deficit <= 5;
  const isHighCalorie = Number.isFinite(mealCalories) && mealCalories > 600;

  return {
    covered,
    message: !covered && deficit > 0
      ? `This meal contains approximately ${Math.round(deficit)}g more carbohydrate than the entered dose covers. Confirm the plan with your clinician; do not independently increase insulin.`
      : null,
    deficit: Math.round(Math.max(0, deficit)),
    isHighCalorieMeal: isHighCalorie,
    highCalorieNote: isHighCalorie ? 'High-fat meals may affect glucose later than usual. Follow the clinician-approved monitoring plan.' : null,
  };
}
