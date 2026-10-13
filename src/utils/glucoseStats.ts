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
  sdMgdl: number;           // standard deviation (mg/dL)
  cvPct: number;            // coefficient of variation (%)
  lbgi: number;             // low blood glucose index (Kovatchev transform)
  hbgi: number;             // high blood glucose index (Kovatchev transform)
  checksPerDay: number;     // average readings per day over the selected period
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Computes TIR / mean / eA1c / variability / LBGI-HBGI from glucose logs. */
export function computeGlucoseStats(logs: GlucoseLog[], days = 30): GlucoseStats {
  const vals = logs
    .map((l) => toMgdl(l.value, l.unit))
    .filter((v) => Number.isFinite(v) && v > 0);
  const count = vals.length;
  if (count === 0) {
    return {
      count: 0, meanMgdl: 0, timeInRangePct: 0, belowRangePct: 0, aboveRangePct: 0,
      eA1c: 0, sdMgdl: 0, cvPct: 0, lbgi: 0, hbgi: 0, checksPerDay: 0,
    };
  }
  const meanMgdl = vals.reduce((a, b) => a + b, 0) / count;
  const below = vals.filter((v) => v < 70).length;
  const above = vals.filter((v) => v > 180).length;
  const inRange = count - below - above;
  const variance = vals.reduce((a, b) => a + (b - meanMgdl) ** 2, 0) / count;
  const sdMgdl = Math.sqrt(variance);

  // LBGI/HBGI: Kovatchev symmetric transformation f(BG)=1.509*((ln BG)^1.084 − 5.381), r=10*f^2.
  let lbgiSum = 0;
  let hbgiSum = 0;
  for (const v of vals) {
    const f = 1.509 * (Math.pow(Math.log(v), 1.084) - 5.381);
    const r = 10 * f * f;
    if (f < 0) lbgiSum += r;
    else hbgiSum += r;
  }

  return {
    count,
    meanMgdl: Math.round(meanMgdl),
    timeInRangePct: Math.round((inRange / count) * 100),
    belowRangePct: Math.round((below / count) * 100),
    aboveRangePct: Math.round((above / count) * 100),
    eA1c: Math.round(((meanMgdl + 46.7) / 28.7) * 10) / 10,
    sdMgdl: round1(sdMgdl),
    cvPct: round1((sdMgdl / meanMgdl) * 100),
    lbgi: round1(lbgiSum / count),
    hbgi: round1(hbgiSum / count),
    checksPerDay: days > 0 ? round1(count / days) : 0,
  };
}
