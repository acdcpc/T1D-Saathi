import { checkMealCoverage, calculateDosing } from '../src/utils/dosingCalc';

describe('checkMealCoverage (safety)', () => {
  it('flags under-covered meals', () => {
    const c = checkMealCoverage(60, 400, 4, 10); // 4u covers 40g, meal is 60g
    expect(c.covered).toBe(false);
    expect(c.deficit).toBe(20);
  });

  it('covers meals within 5g tolerance', () => {
    const c = checkMealCoverage(44, 300, 4, 10);
    expect(c.covered).toBe(true);
  });

  it('never returns a deficit when ICR is invalid', () => {
    const c = checkMealCoverage(80, 300, 5, 0);
    expect(c.covered).toBe(true);
    expect(c.message).toBeNull();
  });
});

describe('calculateDosing', () => {
  it('derives ICR and ISF from TDD (500/1800 rules)', () => {
    const r = calculateDosing(120, 50, { tdd: 50, target_glucose: 120 });
    expect(r.icr).toBeCloseTo(10, 1);   // 500/50
    expect(r.isf).toBeCloseTo(36, 1);   // 1800/50
  });
});
