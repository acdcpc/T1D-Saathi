# T1D-Saathi Feature Batch 2 — 2026-10-05

Branch: `agent/features-batch1` (continues on the same branch; not merged to `main`).
Migration: `supabase/migrations/20261005000010_batch2_features.sql` — **applied to the live project on 2026-10-05**.

## Delivered in this batch

1. **Age-band modes (6–9 / 10–17)** — `patients.age_band`; set at patient creation (auto-suggested from DOB, guardian-overridable) and switchable from the patient dashboard. Child mode simplifies the stats view (hides variability/risk detail); teen mode shows the full panel.
2. **Consent (guardian) + assent (child) flow** — new `consents` table + bilingual `ConsentScreen`; first-run gate on Home for accounts without a consent record; view/update from Settings. Wording flagged for legal review.
3. **Per-record audit log** — `audit_log` table (BIGSERIAL, actor, table, row, details) written by triggers on `insulin_regimens` (approval + dosing params), `care_team` (assignment changes), `consents`, and `profiles` (role changes only). No client access; service/admin only.
4. **Clinic linking via invite codes** — `care_team_invites` (single-use, 14-day expiry; parents create codes) + `redeem_care_team_invite()` SECURITY DEFINER function (clinician-only redemption, creates the care_team row in a controlled way — client writes to `care_team` remain revoked). Parent UI: “Invite Clinician” on the dashboard → Share. Clinician UI: invite-code entry on the patient list.
5. **Patient data deletion (request-to-delete)** — `delete_patient_data()` RPC, owner-authorized + audited; double-confirm UI in Settings → “Your data”.
6. **Motivation: logging streaks** — consecutive-day logging streak card on the dashboard (logging-consistency only, never glucose values) + opt-out toggle in Settings.
7. **Custom reminders** — user-defined reminders (label + time + weekdays) with local weekly notifications; covers school/exam/fasting-day needs in a general way. Managed in Settings.
8. **Caregiver alert fallback (WhatsApp/SMS)** — one-tap “Notify caregiver” on hypo alerts (dashboard + glucose log), prefilled message; matches the owner’s decision to route doctor contact via WhatsApp.
9. **Consent gate never blocks the app** — failures in the consent check are ignored silently.

## Live DB verification (batch 2)

consents / audit_log / care_team_invites tables present; `patients.age_band` present; `write_audit_log`, `redeem_care_team_invite`, `delete_patient_data` present; 4 audit triggers attached. Migration history row recorded.

## Validation performed

- `npx tsc --noEmit` — pass (exit 0)
- `npm test -- --runInBand` — 4 suites / 43 tests pass
- `npm run validate` — repository safety validation passed

## Remaining after batch 2

- **Guardian remote push alerts** — needs push-token registration + a sender (Supabase Edge Function / Expo push); WhatsApp/SMS fallback is live meanwhile. Requires device testing.
- **Clinician web portal** — planned as the next focused build (patient list with flags, trends, approval queue, CSV export).
- **Research exports per study arm** — CSV export covers the base; study-arm tagging depends on the final study design.
- Owner steps: EAS rebuild (preview) when ready; two-user negative tests; clinician sign-off items in `docs/CLINICAL_SAFETY_LOG.md`.
