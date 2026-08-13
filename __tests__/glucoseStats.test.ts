import { computeGlucoseStats, toMgdl } from '../src/utils/glucoseStats';
import type { GlucoseLog } from '../src/types';

function log(value: number, unit: 'mgdl' | 'mmol' = 'mgdl'): GlucoseLog {
  return { id: String(value), patient_id: 'p', user_id: 'u', value, unit, timestamp: new Date().toISOString() } as any;
}

describe('computeGlucoseStats', () => {
  it('returns zeros for empty logs', () => {
    const s = computeGlucoseStats([]);
    expect(s.count).toBe(0);
    expect(s.eA1c).toBe(0);
  });

  it('computes mean and TIR correctly', () => {
    const logs = [log(80), log(100), log(120), log(60), log(200)];
    const s = computeGlucoseStats(logs);
    expect(s.count).toBe(5);
    expect(s.meanMgdl).toBe(112);
    expect(s.timeInRangePct).toBe(60); // 3 of 5 in 70-180
    expect(s.belowRangePct).toBe(20);
    expect(s.aboveRangePct).toBe(20);
  });

  it('converts mmol to mg/dL', () => {
    expect(toMgdl(5.5, 'mmol')).toBe(99);
  });

  it('estimates HbA1c via ADAG formula', () => {
    const logs = [log(154), log(154), log(154)];
    const s = computeGlucoseStats(logs);
    expect(s.eA1c).toBeCloseTo(7.0, 1);
  });
});
