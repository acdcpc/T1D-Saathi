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
