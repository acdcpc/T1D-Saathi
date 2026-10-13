import type { GlucoseLog } from '../types';

/** Number of consecutive days (ending today or yesterday) with at least one log. */
export function computeLoggingStreak(logs: Pick<GlucoseLog, 'timestamp'>[], now = new Date()): number {
  if (!logs.length) return 0;
  const days = new Set(logs.map((l) => new Date(l.timestamp).toDateString()));
  const cursor = new Date(now);
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toDateString())) return 0;
  }
  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
