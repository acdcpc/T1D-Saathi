// Regimen math — shared helpers for clinician/family dosing estimates.
//
// Standard starting estimates used across the app:
//   ISF (correction factor) ≈ 1800 ÷ TDD   (mg/dL per unit)
//   I:C ratio               ≈ 500 ÷ TDD    (g carbs per unit)
//
// TDD (total daily dose) from what the clinician enters:
//   TDD = basal dose (units/day) + bolus dose (units per dose) × bolus frequency (doses/day)

export const ISF_CONSTANT = 1800;
export const ICR_CONSTANT = 500;

/** Bolus frequency label → doses per day (numeric options only). */
export const FREQUENCY_DOSES_PER_DAY: Record<string, number> = {
  'Once daily': 1,
  'Twice daily': 2,
  'Three times daily': 3,
  'Before each meal': 3,
  'Before meals + bedtime': 4,
};

export function dosesPerDayForFrequency(frequency: string | null | undefined): number | null {
  if (!frequency) return null;
  const n = FREQUENCY_DOSES_PER_DAY[frequency];
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * TDD = basal + bolus × frequency.
 * - Bolus without a countable frequency (e.g. sliding scale) → null (keep the manual TDD value).
 * - Basal only → TDD = basal.
 * - Returns null when nothing usable is provided.
 */
export function computeTddFromDoses(
  basalDose: number | null | undefined,
  bolusDose: number | null | undefined,
  frequency: string | null | undefined,
): number | null {
  const hasBasal = typeof basalDose === 'number' && Number.isFinite(basalDose) && basalDose > 0;
  const hasBolus = typeof bolusDose === 'number' && Number.isFinite(bolusDose) && bolusDose > 0;
  let tdd: number | null = null;
  if (hasBolus) {
    const perDay = dosesPerDayForFrequency(frequency);
    if (perDay) tdd = (hasBasal ? (basalDose as number) : 0) + (bolusDose as number) * perDay;
  } else if (hasBasal) {
    tdd = basalDose as number;
  }
  if (tdd == null || !(tdd > 0)) return null;
  return Math.round(tdd * 10) / 10;
}

/** ISF (correction factor) starting estimate — mg/dL per unit. */
export function isfFromTdd(tdd: number | null | undefined): number | null {
  if (typeof tdd !== 'number' || !Number.isFinite(tdd) || tdd <= 0) return null;
  return Math.round(ISF_CONSTANT / tdd);
}

/** I:C ratio starting estimate — g carbs per unit. */
export function icrFromTdd(tdd: number | null | undefined): number | null {
  if (typeof tdd !== 'number' || !Number.isFinite(tdd) || tdd <= 0) return null;
  return Math.round(ICR_CONSTANT / tdd);
}
