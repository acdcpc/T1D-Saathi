// Glucose log saving with a compatibility fallback for databases that have not
// yet applied the batch-1 migration (extra columns: source / mood / activity).
import { safeInsert } from './offlineQueue';

const OPTIONAL_COLUMNS = ['source', 'mood', 'activity_type', 'activity_minutes'] as const;

function stripOptionalColumns(payload: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...payload };
  for (const key of OPTIONAL_COLUMNS) delete copy[key];
  return copy;
}

/** Save a glucose log; retries without optional columns if the schema predates them. */
export async function saveGlucoseEntry(payload: Record<string, unknown>) {
  const first = await safeInsert('glucose_logs', payload);
  if (!first.error || first.queued) return first;
  const message = String((first.error as { message?: string } | null)?.message || '');
  if (/column|schema cache|does not exist|PGRST204/i.test(message)) {
    return safeInsert('glucose_logs', stripOptionalColumns(payload));
  }
  return first;
}
