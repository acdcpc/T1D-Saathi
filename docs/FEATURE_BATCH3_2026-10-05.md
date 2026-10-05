# T1D-Saathi Feature Batch 3 — 2026-10-05

## Staff access (both requested emails)

- New `admin_emails` registry. Staff emails receive the **clinician** role automatically at signup and **full access**:
  - **thisispratha@gmail.com** — upgraded to `clinician` + full access (previous role: parent). ✔ done on live.
  - **archananepal@pahs.edu.np** (Dr. Archana, PAHS) — registered for auto-provisioning. The account does not exist yet; **when she signs up with this email she automatically becomes a clinician with full access** (no system email is sent — she can sign up via the app/portal).
- Full access = read-all policies (patients, glucose/ketone/sick-day/meal/insulin logs, regimens, consents, care-team) + `admin_list_staff`, `admin_add_care_team_member`, `admin_remove_care_team_member` + admin regimen approval. Writes are audited.
- Migration `20261005000011_staff_access.sql` — **applied to live**.

## Clinician web portal (`portal/`)

- Single-file web app (`portal/index.html`) with Supabase Auth email/password login. Uses only the public anon key — Postgres RLS enforces all access.
- Patient list: assigned-only for standard clinicians; **all patients for full-access staff**.
- Per patient: flags (latest glucose, lows/7d, active sick day, approval status, consent), KPI row (TIR / mean / SD / CV / checks per day / est. HbA1c), 14-day trend with 70–180 band, glucose + insulin + sick-day tables.
- Actions: **approve regimen** (audited), **manage care-team links by email** (full access), **CSV export** per patient.
- Local run: `cd portal && python3 -m http.server 8787` → http://localhost:8787 (local `config.js` already written and gitignored).
- Deploy: any static host; upload `index.html` + `config.js`.

## Remote push alerts (caregiver notifications)

- `push_tokens` table (own-row RLS).
- Client `src/utils/pushAlerts.ts`: silently registers the device token when notifications are already allowed; on a low-glucose log it invokes the sender (best-effort; never blocks logging; WhatsApp/SMS tap remains as fallback).
- Supabase Edge Function `notify-caregivers`: **deployed to live (ACTIVE)**. Authorization: patient's parent / assigned clinician / full-access staff. Sends Expo push to the patient's caregivers (excluding the sender's device).
- Smoke-tested with a temporary account: authenticated invoke → correct 404; unauthenticated invoke → 401; test account fully removed afterwards.
- Remaining: real-device verification of push delivery.

## Validation

- `npx tsc --noEmit` — exit 0 · `npm test` — 43/43 · `npm run validate` — pass
- Portal inline JS syntax-checked; edge function deployed + auth-layer smoke test passed.

## Open items (owner steps)

- EAS rebuild (preview) when ready — includes all batches 1–3.
- Real-device: push delivery, notifications, portal walkthrough with both staff accounts.
- Two-user negative tests on real accounts; clinician sign-off items (`docs/CLINICAL_SAFETY_LOG.md`).
