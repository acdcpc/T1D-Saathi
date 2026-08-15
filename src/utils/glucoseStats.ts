import type { GlucoseLog } from '../types';
import { MMOL_TO_MGDL } from './dosingCalc';

export function toMgdl(value: number, unit: 'mgdl' | 'mmol'): number {
  return unit === 'mmol' ? Math.round(value * MMOL_TO_MGDL) : value;
}

export interface GlucoseStats {
  count: number;
  meanMgdl: number;
  timeInRangePct: number;   // % of readings in 70–180 mg/dL
  belowRangePct: number;    // % < 70
  aboveRangePct: number;    // % > 180
  eA1c: number;             // estimated HbA1c % (ADAG: (mean + 46.7) / 28.7)
}

/** Computes TIR / mean / estimated HbA1c from a list of glucose logs. */
export function computeGlucoseStats(logs: GlucoseLog[]): GlucoseStats {
  const vals = logs.map((l) => toMgdl(l.value, l.unit));
  const count = vals.length;
  if (count === 0) {
    return { count: 0, meanMgdl: 0, timeInRangePct: 0, belowRangePct: 0, aboveRangePct: 0, eA1c: 0 };
  }
  const meanMgdl = vals.reduce((a, b) => a + b, 0) / count;
  const below = vals.filter((v) => v < 70).length;
  const above = vals.filter((v) => v > 180).length;
  const inRange = count - below - above;
  return {
    count,
    meanMgdl: Math.round(meanMgdl),
    timeInRangePct: Math.round((inRange / count) * 100),
    belowRangePct: Math.round((below / count) * 100),
    aboveRangePct: Math.round((above / count) * 100),
    eA1c: Math.round(((meanMgdl + 46.7) / 28.7) * 10) / 10,
  };
}
