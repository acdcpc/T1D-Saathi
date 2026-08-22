import {
  calculateDosing, checkMealCoverage, glucoseToMgDl, mgDlToGlucose, DosingValidationError,
} from '../src/utils/dosingCalc';

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

  it('fails closed on a stale glucose reading (>15 min)', () => {
    const stale = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    expect(() => calculateDosing(150, 50, { ...base, glucose_timestamp: stale }))
      .toThrow(DosingValidationError);
  });

  it('accepts a fresh glucose reading (<=15 min)', () => {
    const fresh = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(() => calculateDosing(150, 50, { ...base, glucose_timestamp: fresh })).not.toThrow();
  });

  it('accepts a reading exactly at the 15-minute boundary', () => {
    const boundary = new Date(Date.now() - 15 * 60 * 1000).toISOString();
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
