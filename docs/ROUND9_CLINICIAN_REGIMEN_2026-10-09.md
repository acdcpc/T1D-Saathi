# Sano Bir — Round 9: Clinician regimen editing, family review requests & clinician push alerts (2026-10-09)

Owner feedback addressed:
1. The clinician's patient view had **only an Approve button** — no way to change the regimen. → Clinicians can now **edit & save the full regimen** (individual care per patient).
2. No guidance in the clinician interface → **"What to do" card** added (4 steps, bilingual).
3. Families could not request an approval/change → **"Request clinician review"** on the Insulin-regimen screen (+ on the Log screen's dose-help card); every family regimen save also files a review request automatically.
4. Clinicians got no notification → new **push notification** (`notify-clinicians`) to the patient's assigned clinicians and full-access staff.

## What changed
| Area | Change |
|---|---|
| `src/screens/ClinicianPatientDetailScreen.tsx` | New "What to do" guidance card; **Edit regimen** form (type chips, basal/bolus dropdowns, doses, frequency, TDD, ISF / I:C overrides, correction target, max bolus); Save → update-or-create with `approved_by_clinician=true` (clinician save = approval); **Family requests inbox** with per-request "Mark resolved" + auto-resolve on save/approve; safe when the requests table is absent. |
| `supabase/migrations/20261009000015_regimen_requests.sql` | New table `regimen_requests` (parent requests; clinicians/staff resolve) + 6 RLS policies; **new INSERT policies on `insulin_regimens`** so clinicians/staff can create regimens. Applied live 2026-10-09. |
| `src/screens/RegimenSettingsScreen.tsx` | New "Request clinician review" card (optional note) + status banner; saving a regimen now files a `change` request and notifies clinicians (best effort). |
| `src/screens/LogGlucoseScreen.tsx` | The dose-help card (unapproved regimen) gained a "Request clinician review" button + confirmation state. Dosing logic untouched. |
| `src/utils/pushAlerts.ts` | `notifyCliniciansRequest()` helper (best-effort invoke). |
| `supabase/functions/notify-clinicians/index.ts` | New edge function — sends Expo push to care-team clinicians + full-access staff (excludes sender). Deployed (v1, ACTIVE). |

## How the workflow works (for the owner)
1. **Family**: Settings → Insulin regimen → save changes and/or **Send review request** (with an optional note). The request is stored (`regimen_requests`) and the clinician gets a push: "🩺 {child}: regimen review requested".
2. **Clinician**: opens the child → sees the **Family requests** card → taps **Edit regimen**, adjusts values → **Save & approve** → the request is auto-resolved → the family's dose help unlocks immediately.
3. No request open? The clinician can still edit and approve at any time from the same screen.

## Safety semantics (unchanged / explicit)
- The **fail-closed dosing gate is untouched**: dose help only computes for `approved_by_clinician=true` regimens. What changed: clinicians can now create correct regimens directly (RLS permits INSERT/UPDATE only when the row is marked approved by the acting clinician).
- Saving as a clinician = explicit approval (bilingual copy says so on screen).
- Push notifications are best-effort; the request row is the source of truth (visible in-app regardless of push delivery).

## Verification (2026-10-09)
- `npx tsc --noEmit` → **0 errors**; `npx jest` → **75/75 (5 suites)**; `node scripts/validate-repo.mjs` → **pass**.
- Migration applied via Management API — 20/20 statements; live DB: `regimen_requests` 9 columns + 6 policies; `insulin_regimens` now has 9 policies incl. both new INSERT policies; history row `20261009000015` recorded.
- Edge function `notify-clinicians` **deployed (v1)** — same auth pattern as `notify-caregivers`; source read line-by-line against spec.
- Worker/reviewer lanes this round: all hit the platform service-layer failures; implementation + verification completed on mainline (documented in `.cluster/round9-clinician-regimen/review.md`).

## Notes / limits
- Clinicians need to open the app once and allow notifications for push alerts to reach them (existing behavior).
- If the family never updates/requests a review, no notification is sent (nothing to review).
- Builds remain paused per owner instruction — this round's UI needs the next build to reach devices.
