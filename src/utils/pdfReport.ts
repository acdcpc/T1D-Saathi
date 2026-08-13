import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { PatientProfile, GlucoseLog } from '../types';
import { computeGlucoseStats, toMgdl } from './glucoseStats';

/** Generates a clinic-ready glucose log PDF and opens the share sheet. */
export async function generateGlucoseReport(patient: PatientProfile, logs: GlucoseLog[]): Promise<string> {
  const stats = computeGlucoseStats(logs);
  const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const recent = sorted.slice(-100);

  const rows = recent
    .map((l) => {
      const d = new Date(l.timestamp);
      const dt = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      return `<tr>
        <td>${dt}</td>
        <td>${toMgdl(l.value, l.unit)}</td>
        <td>${l.context === 'sick_day' ? 'Sick day' : 'Routine'}</td>
        <td>${l.carbs || 0}</td>
        <td>${l.insulin_given || 0}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${patient.name} — Glucose Report</title>
<style>
  body { font-family: sans-serif; color: #1A1A2E; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 2px; }
  .sub { color: #7A6E65; font-size: 12px; margin-bottom: 16px; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { background: #E6F4FE; border-radius: 8px; padding: 10px 14px; }
  .stat b { font-size: 18px; display: block; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th, td { border: 1px solid #EDE0D4; padding: 6px 8px; text-align: left; }
  th { background: #FDF8F2; }
  .foot { color: #7A6E65; font-size: 10px; margin-top: 20px; }
</style></head><body>
  <h1>${patient.name} (${patient.sex})</h1>
  <div class="sub">T1D Saathi · Glucose Report · Generated ${new Date().toLocaleString()}</div>
  <div class="stats">
    <div class="stat">Time in Range<b>${stats.timeInRangePct}%</b></div>
    <div class="stat">Mean<b>${stats.meanMgdl}</b></div>
    <div class="stat">Est. HbA1c<b>${stats.eA1c}%</b></div>
    <div class="stat">Readings<b>${stats.count}</b></div>
  </div>
  <table>
    <tr><th>Date</th><th>Glucose (mg/dL)</th><th>Context</th><th>Carbs (g)</th><th>Insulin (U)</th></tr>
    ${rows || '<tr><td colspan="5">No readings yet</td></tr>'}
  </table>
  <div class="foot">This is not a medical device. All values are self-logged and should be reviewed by a clinician.</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share glucose report' });
  }
  return uri;
}
