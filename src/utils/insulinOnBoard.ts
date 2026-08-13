import type { GlucoseLog } from '../types';

// Simple linear decay over 4 hours (rapid-acting insulin ~3–5h duration).
const IOB_DURATION_HOURS = 4;

/** Estimates active insulin on board from recent boluses. */
export function computeIOB(logs: GlucoseLog[]): number {
  const now = Date.now();
  let iob = 0;
  for (const l of logs) {
    const dose = l.insulin_given || 0;
    if (dose <= 0) continue;
    const elapsedH = (now - new Date(l.timestamp).getTime()) / 3600000;
    if (elapsedH <= 0 || elapsedH >= IOB_DURATION_HOURS) continue;
    iob += dose * (1 - elapsedH / IOB_DURATION_HOURS);
  }
  return Math.round(iob * 10) / 10;
}
