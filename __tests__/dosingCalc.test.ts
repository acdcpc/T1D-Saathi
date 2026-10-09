import {
  calculateDosing, checkMealCoverage, glucoseToMgDl, mgDlToGlucose, DosingValidationError,
} from '../src/utils/dosingCalc';
import { calculateCorrectionDose, calculateCarbDose } from '../src/rules/sickDayRules';

describe('glucoseToMgDl / mgDlToGlucose (unit conversion)', () => {
  it('converts mmol to mg/dL', () => {
    expect(glucoseToMgDl(5.5, 'mmol')).toBeCloseTo(99.1, 1); // 5.5 * 18.0182
  });

  it('round-trips mmol -> mg/dL -> mmol', () => {
    expect(mgDlToGlucose(glucoseToMgDl(5.5, 'mmol'), 'mmol')).toBeCloseTo(5.5, 1);
  });

  it('passes through mg/dL unchanged', () => {
    expect(glucoseToMgDl(120, 'mgdl')).toBe(120);
  });

  it('rejects non-positive values', () => {
    expect(() => glucoseToMgDl(0, 'mgdl')).toThrow(DosingValidationError);
    expect(() => glucoseToMgDl(-5, 'mgdl')).toThrow(DosingValidationError);
  });

  it('rejects impossible glucose', () => {
    expect(() => glucoseToMgDl(15, 'mgdl')).toThrow(DosingValidationError);   // < 20
    expect(() => glucoseToMgDl(1100, 'mgdl')).toThrow(DosingValidationError); // > 1000
  });
});

describe('calculateDosing (fail-closed)', () => {
  const base = { tdd: 50, target_glucose: 120, approved_by_clinician: true };

  it('derives ICR and ISF from TDD (500/1800 rules)', () => {
    const r = calculateDosing(150, 50, base);
    expect(r.icr).toBeCloseTo(10, 1); // 500/50
    expect(r.isf).toBeCloseTo(36, 1); // 1800/50
    expect(r.mealBolus).toBeCloseTo(5, 1);
    expect(r.correctionDose).toBeCloseTo(0.8, 1);
    expect(r.totalDose).toBeCloseTo(5.8, 1);
  });

  it('fails closed when regimen is not clinician-approved', () => {
    expect(() => calculateDosing(150, 50, { ...base, approved_by_clinician: false }))
      .toThrow(DosingValidationError);
  });

  it('fails closed on zero TDD', () => {
    expect(() => calculateDosing(150, 50, { ...base, tdd: 0 })).toThrow(DosingValidationError);
  });

  it('fails closed on missing/NaN TDD', () => {
    expect(() => calculateDosing(150, 50, { ...base, tdd: NaN })).toThrow(DosingValidationError);
  });

  it('fails closed on missing target glucose', () => {
    expect(() => calculateDosing(150, 50, { ...base, target_glucose: 0 })).toThrow(DosingValidationError);
  });

  it('fails closed on missing glucose reading', () => {
    expect(() => calculateDosing(NaN, 50, base)).toThrow(DosingValidationError);
  });

  it('fails closed on negative carbs', () => {
    expect(() => calculateDosing(150, -10, base)).toThrow(DosingValidationError);
  });

  it('no correction when glucose is at or below target', () => {
    expect(calculateDosing(120, 50, base).correctionDose).toBe(0);
    expect(calculateDosing(90, 50, base).correctionDose).toBe(0);
  });

  it('supports regular insulin (450/1500 constants)', () => {
    const r = calculateDosing(150, 45, { ...base, icr_constant: 450, isf_constant: 1500 });
    expect(r.icr).toBeCloseTo(9, 1);  // 450/50
    expect(r.isf).toBeCloseTo(30, 1); // 1500/50
  });

  it('honors clinician ISF/ICR overrides passed as effective constants', () => {
    // The regimen screen allows clinician overrides of ISF / I:C. The engine works in
    // constants (divided by TDD), so callers pass override × TDD when one is set.
    const r = calculateDosing(150, 45, { ...base, isf_constant: 30 * 50, icr_constant: 12 * 50 });
    expect(r.isf).toBeCloseTo(30, 5);  // override preserved, not 1800/50=36
    expect(r.icr).toBeCloseTo(12, 5);  // override preserved, not 500/50=10
    expect(r.correctionDose).toBeCloseTo(1, 5);   // (150-120)/30
    expect(r.mealBolus).toBeCloseTo(3.8, 5);      // 45/12 = 3.75 → 3.8
    expect(r.totalDose).toBeCloseTo(4.8, 5);      // 3.75 + 1.0 = 4.75 → 4.8
  });

  it('fails closed on a stale glucose reading (>15 min)', () => {
    const stale = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    expect(() => calculateDosing(150, 50, { ...base, glucose_timestamp: stale }))
      .toThrow(DosingValidationError);
  });

  it('accepts a fresh glucose reading (<=15 min)', () => {
    const fresh = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(() => calculateDosing(150, 50, { ...base, glucose_timestamp: fresh })).not.toThrow();
  });

  it('accepts a reading just inside the 15-minute boundary', () => {
    // A wall-clock test cannot hit an exact boundary deterministically (millisecond
    // drift flips it); stay 1 second inside the 15-minute limit.
    const boundary = new Date(Date.now() - (15 * 60 * 1000 - 1000)).toISOString();
    expect(() => calculateDosing(150, 50, { ...base, glucose_timestamp: boundary })).not.toThrow();
  });

  it('fails closed on an invalid glucose timestamp', () => {
    expect(() => calculateDosing(150, 50, { ...base, glucose_timestamp: 'not-a-date' }))
      .toThrow(DosingValidationError);
  });
});

describe('checkMealCoverage', () => {
  it('flags under-covered meals', () => {
    const c = checkMealCoverage(60, 400, 4, 10);
    expect(c.covered).toBe(false);
    expect(c.deficit).toBe(20);
  });

  it('covers meals within 5g tolerance', () => {
    expect(checkMealCoverage(44, 300, 4, 10).covered).toBe(true);
  });

  it('never claims coverage from invalid ICR', () => {
    const c = checkMealCoverage(80, 300, 5, 0);
    expect(c.covered).toBe(false);
    expect(c.message).not.toBeNull();
  });
});


describe('additional clinical safety boundaries', () => {
  const base = { tdd: 50, target_glucose: 120, approved_by_clinician: true };

  it('fails closed when a dosing constant is zero, NaN, or infinite', () => {
    expect(() => calculateDosing(150, 50, { ...base, icr_constant: 0 })).toThrow(DosingValidationError);
    expect(() => calculateDosing(150, 50, { ...base, isf_constant: NaN })).toThrow(DosingValidationError);
    expect(() => calculateDosing(150, 50, { ...base, icr_constant: Infinity })).toThrow(DosingValidationError);
  });

  it('fails closed for unsupported extreme glucose and carbohydrate values', () => {
    expect(() => calculateDosing(19, 50, base)).toThrow(DosingValidationError);
    expect(() => calculateDosing(1001, 50, base)).toThrow(DosingValidationError);
    expect(() => calculateDosing(150, 1001, base)).toThrow(DosingValidationError);
  });

  it('does not accept a future-invalid glucose timestamp', () => {
    expect(() => calculateDosing(150, 50, { ...base, glucose_timestamp: 'not-a-date' }))
      .toThrow('The glucose reading is too old');
  });

  it('returns a non-negative correction and preserves the approved regimen identifier', () => {
    const result = calculateDosing(100, 25, { ...base, regimen_id: 'regimen-42' });
    expect(result.correctionDose).toBe(0);
    expect(result.totalDose).toBeGreaterThanOrEqual(0);
    expect(result.regimen_id).toBe('regimen-42');
  });
});

describe('maximum bolus guard', () => {
  const base = { tdd: 50, target_glucose: 120, approved_by_clinician: true };

  it('flags a total above the clinician-set maximum bolus', () => {
    const r = calculateDosing(150, 50, { ...base, max_bolus: 5 });
    expect(r.totalDose).toBeCloseTo(5.8, 1);
    expect(r.exceedsMaxBolus).toBe(true);
    expect(r.maxBolus).toBe(5);
  });

  it('does not flag doses under the maximum', () => {
    const r = calculateDosing(150, 50, { ...base, max_bolus: 10 });
    expect(r.exceedsMaxBolus).toBe(false);
  });

  it('leaves the guard unset when no maximum is configured', () => {
    const r = calculateDosing(150, 50, { ...base });
    expect(r.exceedsMaxBolus).toBe(false);
    expect(r.maxBolus).toBeUndefined();
  });
});

describe('strict engine — boundary edges (round 8)', () => {
  const base = { tdd: 50, target_glucose: 120, approved_by_clinician: true };

  it('accepts a target exactly at the 60 mg/dL lower bound', () => {
    const r = calculateDosing(150, 50, { ...base, target_glucose: 60 });
    expect(r.correctionDose).toBeCloseTo(2.5, 1); // (150 - 60) / (1800/50)
    expect(r.totalDose).toBeCloseTo(7.5, 1);      // 5.0 meal + 2.5 correction
  });

  it('accepts a target exactly at the 250 mg/dL upper bound', () => {
    const r = calculateDosing(150, 50, { ...base, target_glucose: 250 });
    expect(r.correctionDose).toBe(0);
    expect(r.totalDose).toBeCloseTo(5, 1);
  });

  it('rejects targets just outside the 60–250 bounds', () => {
    expect(() => calculateDosing(150, 50, { ...base, target_glucose: 59.9 }))
      .toThrow(DosingValidationError);
    expect(() => calculateDosing(150, 50, { ...base, target_glucose: 250.1 }))
      .toThrow(DosingValidationError);
  });

  it('accepts exactly 1000 g of carbs and rejects above it', () => {
    const r = calculateDosing(150, 1000, base);
    expect(r.mealBolus).toBeCloseTo(100, 1); // 1000 / 10
    expect(() => calculateDosing(150, 1000.1, base)).toThrow(DosingValidationError);
    expect(() => calculateDosing(150, 1500, base)).toThrow(DosingValidationError);
  });

  it('accepts zero carbs (correction-only dose)', () => {
    const r = calculateDosing(150, 0, base);
    expect(r.mealBolus).toBe(0);
    expect(r.correctionDose).toBeCloseTo(0.8, 1);
    expect(r.totalDose).toBeCloseTo(0.8, 1);
  });

  it('rejects a clearly stale reading and accepts a fresh one', () => {
    const stale = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(() => calculateDosing(150, 50, { ...base, glucose_timestamp: stale }))
      .toThrow(DosingValidationError);
    const fresh = new Date(Date.now() - 60 * 1000).toISOString();
    expect(() => calculateDosing(150, 50, { ...base, glucose_timestamp: fresh }))
      .not.toThrow();
  });
});

describe('strict engine — maximum bolus boundaries (round 8)', () => {
  const base = { tdd: 50, target_glucose: 120, approved_by_clinician: true };

  it('does not flag a total exactly at the maximum bolus', () => {
    const r = calculateDosing(150, 50, { ...base, max_bolus: 5.8 });
    expect(r.totalDose).toBe(5.8);
    expect(r.exceedsMaxBolus).toBe(false);
    expect(r.maxBolus).toBe(5.8);
  });

  it('leaves the guard unset for invalid maximums (0 / NaN / negative)', () => {
    for (const bad of [0, NaN, -5]) {
      const r = calculateDosing(150, 50, { ...base, max_bolus: bad });
      expect(r.exceedsMaxBolus).toBe(false);
      expect(r.maxBolus).toBeUndefined();
    }
  });
});

describe('strict engine — mmol inputs (round 8)', () => {
  const base = { tdd: 50, target_glucose: 120, approved_by_clinician: true };

  it('computes a dose from a mmol reading converted to mg/dL', () => {
    const mmolReading = glucoseToMgDl(10, 'mmol'); // ≈ 180.2 mg/dL
    const r = calculateDosing(mmolReading, 50, base);
    expect(r.icr).toBeCloseTo(10, 1);
    expect(r.isf).toBeCloseTo(36, 1);
    expect(r.correctionDose).toBeCloseTo(1.7, 1); // (180.2 - 120) / 36
    expect(r.totalDose).toBeCloseTo(6.7, 1);
  });

  it('rejects mmol readings outside the supported mg/dL range', () => {
    expect(() => glucoseToMgDl(1, 'mmol')).toThrow(DosingValidationError);    // ≈ 18 mg/dL < 20
    expect(() => glucoseToMgDl(1.09, 'mmol')).toThrow(DosingValidationError); // ≈ 19.6 mg/dL < 20
    expect(() => glucoseToMgDl(56, 'mmol')).toThrow(DosingValidationError);   // ≈ 1009 mg/dL > 1000
    expect(() => glucoseToMgDl(55, 'mmol')).not.toThrow();                    // ≈ 991 mg/dL — inside range
  });
});

describe('sick-day helper hardening — calculateCorrectionDose', () => {
  it('computes the correction from a clinician-set ISF', () => {
    expect(calculateCorrectionDose(180, 120, 50, 30)).toBeCloseTo(2, 5);
  });

  it('derives the factor from TDD via the 1800 rule when ISF is absent', () => {
    expect(calculateCorrectionDose(180, 120, 50)).toBeCloseTo(1.6667, 3); // 60 / (1800/50)
  });

  it('does not need TDD when an explicit ISF is supplied', () => {
    expect(calculateCorrectionDose(180, 120, NaN, 30)).toBeCloseTo(2, 5);
  });

  it('returns 0 at or below target', () => {
    expect(calculateCorrectionDose(120, 120, 50, 30)).toBe(0);
    expect(calculateCorrectionDose(85, 120, 50, 30)).toBe(0);
  });

  it('returns 0 for NaN / zero / negative glucose inputs', () => {
    expect(calculateCorrectionDose(NaN, 120, 50, 30)).toBe(0);
    expect(calculateCorrectionDose(0, 120, 50, 30)).toBe(0);
    expect(calculateCorrectionDose(-50, 120, 50, 30)).toBe(0);
    expect(calculateCorrectionDose(180, NaN, 50, 30)).toBe(0);
    expect(calculateCorrectionDose(180, -5, 50, 30)).toBe(0);
  });

  it('returns 0 when no usable factor can be derived (no ISF, unusable TDD)', () => {
    expect(calculateCorrectionDose(180, 120, NaN)).toBe(0);
    expect(calculateCorrectionDose(180, 120, 0)).toBe(0);
    expect(calculateCorrectionDose(180, 120, -50)).toBe(0);
  });

  it('fails closed when a supplied ISF is unusable (does not silently approximate)', () => {
    expect(calculateCorrectionDose(180, 120, 50, 0)).toBe(0);
    expect(calculateCorrectionDose(180, 120, 50, NaN)).toBe(0);
    expect(calculateCorrectionDose(180, 120, 50, -30)).toBe(0);
    expect(calculateCorrectionDose(180, 120, 50, Infinity)).toBe(0);
  });

  it('never returns NaN or Infinity', () => {
    const results = [
      calculateCorrectionDose(NaN, 120, 50),
      calculateCorrectionDose(180, NaN, 50),
      calculateCorrectionDose(180, 120, NaN),
      calculateCorrectionDose(Infinity, 120, 50),
      calculateCorrectionDose(180, 120, 50, NaN),
      calculateCorrectionDose(180, 120, 50, Infinity),
    ];
    results.forEach((r) => expect(Number.isFinite(r)).toBe(true));
    expect(results.every((r) => r === 0)).toBe(true);
  });
});

describe('sick-day helper hardening — calculateCarbDose', () => {
  it('computes the carb dose from a clinician-set I:C ratio', () => {
    expect(calculateCarbDose(60, 10)).toBeCloseTo(6, 5);
    expect(calculateCarbDose(45, 15)).toBeCloseTo(3, 5);
  });

  it('does not need TDD when an explicit ratio is supplied', () => {
    expect(calculateCarbDose(60, 10, NaN)).toBeCloseTo(6, 5);
  });

  it('derives the ratio from TDD via the 500 rule when the ratio is absent', () => {
    expect(calculateCarbDose(60, undefined, 50)).toBeCloseTo(6, 5); // 500/50 = 10
  });

  it('returns 0 for NaN / zero / negative carbs', () => {
    expect(calculateCarbDose(NaN, 10)).toBe(0);
    expect(calculateCarbDose(0, 10)).toBe(0);
    expect(calculateCarbDose(-20, 10)).toBe(0);
    expect(calculateCarbDose(Infinity, 10)).toBe(0);
  });

  it('returns 0 when neither a ratio nor a usable TDD is available (no 1:10 guess)', () => {
    expect(calculateCarbDose(60)).toBe(0);
    expect(calculateCarbDose(60, undefined, NaN)).toBe(0);
    expect(calculateCarbDose(60, undefined, 0)).toBe(0);
    expect(calculateCarbDose(60, undefined, -50)).toBe(0);
  });

  it('fails closed when a supplied I:C ratio is unusable', () => {
    expect(calculateCarbDose(60, 0)).toBe(0);
    expect(calculateCarbDose(60, NaN)).toBe(0);
    expect(calculateCarbDose(60, -10)).toBe(0);
    expect(calculateCarbDose(60, Infinity)).toBe(0);
  });

  it('never returns NaN or Infinity', () => {
    const results = [
      calculateCarbDose(NaN, 10),
      calculateCarbDose(60, NaN),
      calculateCarbDose(60, undefined, NaN),
      calculateCarbDose(Infinity, Infinity),
    ];
    results.forEach((r) => expect(Number.isFinite(r)).toBe(true));
    expect(results.every((r) => r === 0)).toBe(true);
  });
});
