// CSV export for records (parent-facing; usable for research hand-off).
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import type { PatientProfile } from '../types';

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'patient';
}

/** Build a combined glucose + insulin CSV export and open the share sheet. */
export async function exportPatientCsv(patient: PatientProfile): Promise<{ ok: boolean; message?: string }> {
  try {
    const glucoseFull = await supabase
      .from('glucose_logs')
      .select('id,value,unit,context,timestamp,carbs,insulin_given,notes,source,mood,activity_type,activity_minutes')
      .eq('patient_id', patient.id)
      .order('timestamp', { ascending: true })
      .limit(2000);

    let glucoseRows: Record<string, unknown>[] | null = glucoseFull.error ? null : (glucoseFull.data as Record<string, unknown>[]);
    if (!glucoseRows) {
      // Compatibility: latest migration not applied yet — export the base columns.
      const basic = await supabase
        .from('glucose_logs')
        .select('id,value,unit,context,timestamp,carbs,insulin_given,notes')
        .eq('patient_id', patient.id)
        .order('timestamp', { ascending: true })
        .limit(2000);
      glucoseRows = (basic.data as Record<string, unknown>[]) || [];
    }

    const insulinRes = await supabase
      .from('insulin_logs')
      .select('id,units,insulin_type,source,timestamp')
      .eq('patient_id', patient.id)
      .order('timestamp', { ascending: true })
      .limit(2000);
    const insulinRows: Record<string, unknown>[] = insulinRes.error ? [] : ((insulinRes.data as Record<string, unknown>[]) || []);

    const header = [
      'record_type', 'timestamp', 'glucose_value', 'glucose_unit', 'context',
      'carbs_g', 'insulin_given_u', 'insulin_type', 'insulin_units', 'source',
      'notes', 'mood', 'activity_type', 'activity_minutes',
    ];
    const rows: unknown[][] = [header];
    for (const g of glucoseRows) {
      rows.push([
        'glucose', g.timestamp, g.value, g.unit, g.context,
        g.carbs, g.insulin_given, '', '', g.source ?? 'manual',
        g.notes, g.mood, g.activity_type, g.activity_minutes,
      ]);
    }
    for (const d of insulinRows) {
      rows.push([
        'insulin', d.timestamp, '', '', '',
        '', '', d.insulin_type, d.units, d.source,
        '', '', '', '',
      ]);
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) return { ok: false, message: 'Sharing is not available on this device.' };

    const stamp = new Date().toISOString().slice(0, 10);
    const uri = `${FileSystem.cacheDirectory}t1d_${safeFileName(patient.name)}_export_${stamp}.csv`;
    await FileSystem.writeAsStringAsync(uri, toCsv(rows), { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export records (CSV)' });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Export failed.' };
  }
}
