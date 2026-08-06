// Dosing calculations for T1D Saathi
// ISPAD-standard formulas with configurable constants

export interface DosingParams {
  tdd: number;
  icr_constant?: number;   // default 500 (rapid-acting): 450 for some protocols
  isf_constant?: number;   // default 1800 (rapid-acting): 1500 for regular insulin
  target_glucose?: number; // default 120 mg/dL
}

export interface DosingResult {
  icr: number;
  isf: number;
  mealBolus: number;
  correctionDose: number;
  totalDose: number;
  target_glucose: number;
}

export function calculateDosing(
  currentGlucose: number,
  mealCarbs: number,
  params: DosingParams
): DosingResult {
  const icrConstant = params.icr_constant || 500;
  const isfConstant = params.isf_constant || 1800;
  const targetGlucose = params.target_glucose || 120;

  const icr = params.tdd > 0 ? icrConstant / params.tdd : 0;
  const isf = params.tdd > 0 ? isfConstant / params.tdd : 0;

  const mealBolus = icr > 0 ? mealCarbs / icr : 0;
  const correctionDose = (isf > 0 && currentGlucose > targetGlucose)
    ? (currentGlucose - targetGlucose) / isf
    : 0;

  const totalDose = mealBolus + correctionDose;

  return {
    icr: Math.round(icr * 10) / 10,
    isf: Math.round(isf * 10) / 10,
    mealBolus: Math.round(mealBolus * 10) / 10,
    correctionDose: Math.round(correctionDose * 10) / 10,
    totalDose: Math.round(totalDose * 10) / 10,
    target_glucose: targetGlucose,
  };
}

// Check if meal carbs exceed coverage from planned insulin dose
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
  icr: number
): CoverageCheck {
  if (icr <= 0) return { covered: true, message: null, deficit: 0, isHighCalorieMeal: false, highCalorieNote: null };

  const carbsCovered = plannedInsulinDose * icr;
  const deficit = mealCarbs - carbsCovered;

  const covered = deficit <= 5; // within 5g tolerance
  const isHighCalorie = mealCalories > 600;

  let message: string | null = null;
  let highCalorieNote: string | null = null;

  if (!covered && deficit > 0) {
    message = `⚠️ This meal has more carbs than your planned dose covers. Without more insulin, blood sugar is likely to rise.\n\n` +
      `• Planned dose: ${plannedInsulinDose.toFixed(1)} units covers ~${Math.round(carbsCovered)}g carbs\n` +
      `• Meal carbs: ${mealCarbs}g\n` +
      `• Shortfall: ~${Math.round(deficit)}g carbs\n\n` +
      `Consider adjusting the dose or a smaller portion, or check with your clinician.`;
  }

  if (isHighCalorie) {
    highCalorieNote = `📝 High-fat meals can raise sugar later than usual — consider rechecking glucose 2–3 hours after eating.`;
  }

  return { covered, message, deficit: Math.round(deficit), isHighCalorieMeal: isHighCalorie, highCalorieNote };
}
