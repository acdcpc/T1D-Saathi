import { computeLoggingStreak } from '../src/utils/streak';

const logAt = (d: Date) => ({ timestamp: d.toISOString() });

describe('computeLoggingStreak', () => {
  const now = new Date('2026-10-05T10:00:00');

  it('returns 0 with no logs', () => {
    expect(computeLoggingStreak([], now)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const logs = [
      logAt(new Date('2026-10-05T09:00:00')),
      logAt(new Date('2026-10-04T20:00:00')),
      logAt(new Date('2026-10-03T08:00:00')),
    ];
    expect(computeLoggingStreak(logs, now)).toBe(3);
  });

  it('keeps the streak alive if today has no log yet but yesterday does', () => {
    const logs = [logAt(new Date('2026-10-04T20:00:00')), logAt(new Date('2026-10-03T08:00:00'))];
    expect(computeLoggingStreak(logs, now)).toBe(2);
  });

  it('breaks the streak on a missed day', () => {
    const logs = [logAt(new Date('2026-10-05T09:00:00')), logAt(new Date('2026-10-02T09:00:00'))];
    expect(computeLoggingStreak(logs, now)).toBe(1);
  });
});
