// Dedicated insulin dose diary helpers (separate from regimen settings).
// Doses are user-confirmed records; long-acting and rapid-acting are kept distinct.
import { supabase } from '../lib/supabase';
import { safeInsert } from './offlineQueue';
import type { InsulinLog } from '../types';

export interface InsulinDoseInput {
  patient_id: string;
  user_id: string;
  units: number;
  insulin_type?: 'rapid' | 'long' | 'mixed' | 'other';
  source?: 'manual' | 'food_estimator' | 'sick_day' | 'other';
  notes?: string;
}

/** Recent doses used for insulin-on-board (IOB) estimates. Soft-fails to [] on older schemas. */
export async function fetchRecentInsulinDoses(patientId: string, hours = 8): Promise<InsulinLog[]> {
  try {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('insulin_logs')
      .select('id,patient_id,user_id,units,insulin_type,source,timestamp')
      .eq('patient_id', patientId)
      .gte('timestamp', since)
      .order('timestamp', { ascending: true })
      .limit(500);
    if (error) return [];
    return (data as InsulinLog[]) || [];
  } catch {
    return [];
  }
}

/** Save a dose the user explicitly confirmed. */
export async function saveInsulinDose(
  input: InsulinDoseInput
): Promise<{ saved: boolean; queued?: boolean; message?: string }> {
  if (!Number.isFinite(input.units) || input.units <= 0 || input.units > 200) {
    return { saved: false, message: 'Enter a valid dose in units.' };
  }
  const payload = {
    patient_id: input.patient_id,
    user_id: input.user_id,
    units: Math.round(input.units * 10) / 10,
    insulin_type: input.insulin_type || 'rapid',
    source: input.source || 'manual',
    ...(input.notes ? { notes: input.notes } : {}),
    timestamp: new Date().toISOString(),
  };
  const res = await safeInsert('insulin_logs', payload);
  if (res.error && !res.queued) {
    return {
      saved: false,
      message: 'The dose could not be saved. If this keeps failing, the app database update may still be pending — tell your care team.',
    };
  }
  return { saved: true, queued: res.queued };
}
