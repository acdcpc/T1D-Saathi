import type { GlucoseLog, InsulinLog } from '../types';

// Simple linear decay over 4 hours (rapid-acting insulin ~3–5h duration).
const IOB_DURATION_HOURS = 4;

/**
 * Estimates active bolus insulin on board from recent doses.
 * Sources: insulin recorded on glucose logs + the dedicated insulin dose diary.
 * Long-acting / other insulin is excluded from bolus IOB.
 */
export function computeIOB(logs: GlucoseLog[], insulinLogs: InsulinLog[] = []): number {
  const now = Date.now();
  let iob = 0;

  const add = (dose: number, timestamp: string) => {
    if (!Number.isFinite(dose) || dose <= 0) return;
    const elapsedH = (now - new Date(timestamp).getTime()) / 3600000;
    if (elapsedH <= 0 || elapsedH >= IOB_DURATION_HOURS) return;
    iob += dose * (1 - elapsedH / IOB_DURATION_HOURS);
  };

  for (const l of logs) add(l.insulin_given || 0, l.timestamp);
  for (const d of insulinLogs) {
    if (d.insulin_type === 'long' || d.insulin_type === 'other') continue;
    add(d.units || 0, d.timestamp);
  }

  return Math.round(iob * 10) / 10;
}
