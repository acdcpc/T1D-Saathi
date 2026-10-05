# UI Refresh — Home & Login (2026-10-05)

Requested: bring the app's look closer to top diabetes apps (mySugr / One Drop patterns).

## What changed

### Home screen (`src/screens/HomeScreen.tsx`)
- **Header**: brand dot + title, greeting on its own line; emergency is now a soft-red **SOS pill** (clearer than the lone triangle); settings in a soft circular button.
- **Sync status**: single status pill ("Synced · time" / "N waiting to sync" / "N conflicts — review") that is tappable (conflicts open the review dialog, otherwise triggers refresh). Removed the stray italic "Last synced" line and the odd floating divider.
- **Empty state**: friendly hero (layered circles + droplet), "Let's get started" headline, one **big primary CTA ("Add your child")** instead of a pointer-to-FAB hint; a small feature list card (glucose / photo carbs / sick-day wizard) explains value without fake buttons.
- **Patient cards**: proper row layout (avatar → name + chips → chevron circle), soft shadows, rounded 18px, meta chips (age band, insulin type).
- **Width constraint**: content column max 640px, centered — fixes the stretched "sloppy" look on desktop/tablet.
- FAB hidden in the empty state (avoids duplicate CTAs); shown once patients exist.

### Login screen (`src/screens/LoginScreen.tsx`)
- Content now sits in a **centered white card (max 400px)** instead of full-width bars — proper login composition on desktop and mobile.
- Removed the duplicated "T1D Saathi" subtitle line.

## Bug found & fixed during visual QA

`HomeScreen` queried `patients.documents`, a column that **did not exist** in the live database — so the patient list silently failed (error 42703) and always showed the empty state, for every user. Fixed by migration `20261005000012_patients_documents_fix.sql` (adds `documents TEXT[]`), applied live. The patient list now loads.

## Verification

- Automated visual QA with headless Chrome (Playwright): login → consent → home empty → add patient → list, desktop (1360px) and mobile (390px). Screenshots in `docs/screenshots/2026-10-05/`.
- `npx tsc --noEmit` pass; repository validator pass.

## Known / next

- Web only: a harmless 404 probe for `tflite_web_api_cc_simd.js` occurs on load (the classifier's wasm loads from `/wasm/` when the food screen is used — verify during food-screen testing).
- Next UI passes: Patient Dashboard, Log Glucose, Food Estimator, Settings — same treatment (spacing, cards, hierarchy) pending review of this round.

---

# Round 2 — Dashboard, Log, Food, Settings (same day)

Applied the same treatment across the core screens:

- **Global cards** (`theme.ts`): white background, 18px radius, 1px warm border, softer shadow — consistent "clean card" look everywhere.
- **Patient Dashboard**: centered column; status pill on the latest glucose card ("In range / Low / High"); stat tiles restyled (white, bordered); action tiles white/rounded; removed the decorative triangle divider and the outdated "CGM coming soon" chip.
- **Log Glucose**: centered column, parchment background, consistent white inputs.
- **Food Estimator**: parchment background + centered column.
- **Settings**: centered column, white rows.
- **Tab bar**: white with hairline top border.
- **Robustness**: regimen fetches switched from `.single()` → `.maybeSingle()` (no more 406 console errors when no regimen exists).

Verified again via headless Chrome (desktop + mobile). New screenshots in `docs/screenshots/2026-10-05/` (`dashboard-desktop`, `dashboard-mobile`, `log-desktop`, `food-desktop`).

Still older-style (next rounds if wanted): Sick-Day Wizard, Emergency, Education/Quiz, Messages, Add Patient form, Regimen settings, Onboarding.

---

# Round 3 — Sick-Day, Emergency, Add Patient, Regimen, Education/Quiz, Clinician screens (same day)

- Replaced the remaining light-blue (`#F0F7FF`) screen backgrounds with the app's consistent parchment theme.
- Added centered content columns (max 640px) to: Sick-Day Wizard, Regimen Settings, Add Patient, Emergency, Education, Quiz, plus clinician screens.
- Education/Quiz headers aligned to the same centered column as their lists.
- Verified with headless Chrome again (zero page errors). Screenshots: `docs/screenshots/2026-10-05/` (`onboarding`, `emergency`, `addpatient`, `sickday`, `regimen`, `education`).

Remaining old-style touches (minor): Messages bubbles, Barcode scanner, Community, Onboarding slide art (functional, just simple).
