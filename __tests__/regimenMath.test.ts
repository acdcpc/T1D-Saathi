import {
  computeTddFromDoses, isfFromTdd, icrFromTdd, dosesPerDayForFrequency,
} from '../src/utils/regimenMath';

describe('regimenMath — TDD / ISF / I:C estimates', () => {
  it('computes TDD = basal + bolus × frequency', () => {
    expect(computeTddFromDoses(10, 4, 'Three times daily')).toBe(22);
    expect(computeTddFromDoses(12, 3, 'Before meals + bedtime')).toBe(24);
    expect(computeTddFromDoses(14, 5, 'Twice daily')).toBe(24);
    expect(computeTddFromDoses(10, 4, 'Once daily')).toBe(14);
  });

  it('basal only → TDD = basal', () => {
    expect(computeTddFromDoses(12, null, null)).toBe(12);
    expect(computeTddFromDoses(12, 0, 'Twice daily')).toBe(12);
  });

  it('bolus only with a countable frequency', () => {
    expect(computeTddFromDoses(null, 3, 'Twice daily')).toBe(6);
    expect(computeTddFromDoses(null, 3, 'Before each meal')).toBe(9);
  });

  it('bolus without a countable frequency → null (keep manual TDD)', () => {
    expect(computeTddFromDoses(10, 4, 'Sliding scale')).toBeNull();
    expect(computeTddFromDoses(10, 4, null)).toBeNull();
    expect(computeTddFromDoses(10, 4, 'unknown')).toBeNull();
  });

  it('nothing usable → null', () => {
    expect(computeTddFromDoses(null, null, 'Once daily')).toBeNull();
    expect(computeTddFromDoses(0, 0, 'Once daily')).toBeNull();
    expect(computeTddFromDoses(-2, NaN, 'Once daily')).toBeNull();
  });

  it('rounds TDD to 1 decimal', () => {
    expect(computeTddFromDoses(10, 2.5, 'Three times daily')).toBe(17.5);
  });

  it('ISF (correction factor) = 1800 ÷ TDD, rounded', () => {
    expect(isfFromTdd(20)).toBe(90);
    expect(isfFromTdd(22)).toBe(82);
    expect(isfFromTdd(30)).toBe(60);
  });

  it('I:C ratio = 500 ÷ TDD, rounded', () => {
    expect(icrFromTdd(20)).toBe(25);
    expect(icrFromTdd(22)).toBe(23);
    expect(icrFromTdd(30)).toBe(17);
  });

  it('invalid TDD → null', () => {
    expect(isfFromTdd(null)).toBeNull();
    expect(isfFromTdd(0)).toBeNull();
    expect(isfFromTdd(undefined)).toBeNull();
    expect(icrFromTdd(-1)).toBeNull();
    expect(icrFromTdd(NaN)).toBeNull();
  });

  it('frequency map covers the numeric options', () => {
    expect(dosesPerDayForFrequency('Once daily')).toBe(1);
    expect(dosesPerDayForFrequency('Twice daily')).toBe(2);
    expect(dosesPerDayForFrequency('Three times daily')).toBe(3);
    expect(dosesPerDayForFrequency('Before each meal')).toBe(3);
    expect(dosesPerDayForFrequency('Before meals + bedtime')).toBe(4);
    expect(dosesPerDayForFrequency('Sliding scale')).toBeNull();
    expect(dosesPerDayForFrequency('')).toBeNull();
  });
});
