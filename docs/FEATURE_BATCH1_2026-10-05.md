# T1D-Saathi Feature Batch 1 — 2026-10-05

Branch: `agent/features-batch1` (not merged to `main`).

## Delivered in this batch

1. **Clinician approval workflow** — assigned clinicians can approve a patient's insulin regimen in-app (Clinician → patient detail → Approve). Dosing stays blocked (fail-closed) until approval. Regimen history remains append-only by `effective_date`.
2. **Maximum bolus guard** — new optional, clinician-set `max_bolus` on the regimen. The dose calculator warns and blocks saving when a calculated total exceeds it. No cap is applied when unset (nothing clinical is invented).
3. **Insulin stacking notice** — dose screen shows estimated active insulin (IOB, 4-hour linear decay) from recent doses with a non-directive warning.
4. **Insulin dose diary** — new `insulin_logs` table; logging from: food estimator (confirmed dose), sick-day supplemental dose, manual long-acting doses. Offline idempotency (`client_event_id`) + RLS included.
5. **Statistics upgrade** — SD, CV, LBGI/HBGI (Kovatchev), checks/day, Day/Week/Month range selector, risk-index line.
6. **Diary enrichment** — optional mood ("feeling") and activity fields on glucose logs; new `source` field (manual / sick_day).
7. **Reminder improvements** — reminder toggles now persist across restarts; dashboard shows the next scheduled reminder.
8. **15/15 hypo card** — Emergency screen mild-hypoglycemia steps (dashboard alert already existed).
9. **CSV export** — glucose + insulin records export as one CSV (`record_type` column) via the share sheet.
10. **Tests** — 39 passing (5 new covering the max-bolus guard and SD/CV/checks-per-day/LBGI-HBGI).

## Files changed

- `supabase/migrations/20261005000008_batch1_features.sql` (NEW)
- `src/utils/`: `dosingCalc.ts`, `glucoseStats.ts`, `insulinOnBoard.ts`, `offlineQueue.ts`, `reminders.ts`, `insulinLogs.ts` (NEW), `glucoseEntries.ts` (NEW), `csvExport.ts` (NEW)
- `src/types/index.ts`
- `src/screens/`: `LogGlucoseScreen.tsx`, `FoodEstimatorScreen.tsx`, `SickDayWizardScreen.tsx`, `PatientDashboard.tsx`, `RegimenSettingsScreen.tsx`, `ClinicianPatientDetailScreen.tsx`, `EmergencyScreen.tsx`, `SettingsScreen.tsx`
- `__tests__/dosingCalc.test.ts`, `__tests__/glucoseStats.test.ts`
- `docs/CLINICAL_SAFETY_LOG.md`

## Deployment requirements

1. Apply migrations in order on the live Supabase project (both still pending):
   - `20260821000007_audit_hardening.sql`
   - `20261005000008_batch1_features.sql`
2. Rebuild the app (EAS preview) after migrations are applied.

Read paths degrade gracefully if the migration is not yet applied (fallbacks in place), but new write features (insulin diary, mood/activity, max bolus) require the migration.

## Validation performed

- `npx tsc --noEmit` — pass
- `npm test -- --runInBand` — 3 suites / 39 tests pass
- `npm run validate` — repository safety validation passed

## Not in this batch (next candidates)

- Age-band modes (6–9 / 10–17) + adolescent privacy settings
- Consent (guardian) / assent (child) flows
- Guardian push alerts on low/high readings
- Clinic linking UI (care-team assignment workflow)
- Reminder profiles (school / exam / fasting days)
- Motivation: streaks + rewards (logging-only, opt-out), companion design
- Per-record audit log + account deletion flow
- Clinician web portal (separate surface)
- Research/outcome tracking exports per study arm

> Questionnaires, Bluetooth meter integration, and teleconsultation were intentionally excluded by the owner (2026-10-05). Families contact the clinician through the existing helpline / WhatsApp.
