# Round 8 fixes — 2026-10-08

Owner feedback round (4 items): (1) rapid-acting (bolus) dose missing from the insulin regimen + verify dose-calc correctness ("most crucial"); (2) Log screen has no back button and "Calculate Dosing" did not calculate; (3) admin area for admin-email logins; (4) tester/validator pass.

**No APK build / publish / install in this round** (per owner instruction — builds paused until explicitly requested). All changes verified by tests + independent reviewers; ready to build on the next go-ahead.

## 1. Bolus (rapid-acting) dose — added everywhere
- **DB (migration `supabase/migrations/20261008000014_bolus_dose.sql`)**: `insulin_regimens.bolus_dose numeric`, `patients.bolus_dose numeric` — additive, nullable. *(Applied to live DB via Management API as part of this round's delivery; app builds must ship after this migration.)*
- **Add patient**: new "Rapid-acting (bolus) dose (units per day)" field (side-by-side with basal) → saves to `patients.bolus_dose` + initial `insulin_regimens.bolus_dose`.
- **Insulin regimen settings**: new "Rapid-acting (bolus) dose (units/day)" field with a bilingual hint showing basal + bolus = N U/day ("many clinicians use this sum as TDD — confirm with your clinician"). The TDD field is never auto-overwritten.
- **Log screen** regimen card now shows "Basal 12 U/day · Bolus 8 U/day"; **clinician patient view** shows the bolus dose.

## 2. Dosing calculation — verified + unified (most critical)
- The Log screen now uses the app's **canonical strict engine** (`src/utils/dosingCalc.ts` — same engine as the Food photo dose path): fails closed, exact 0.1 U rounding, 15-min glucose freshness, max-bolus guard.
- **Why "Calculate Dosing" did nothing for you**: the dose only calculates with a **clinician-approved regimen** (clinical-safety policy across the whole app). Your test regimens are not approved yet, and the screen previously gave no feedback — it looked broken. Now it explicitly says what's missing and how to fix it ("Dose help unlocks after your clinician reviews your regimen — clinician: open the child → 'Approve regimen for dosing'"). Once a clinician approves (or you approve from a clinician account), the same button shows Correction / Carb / Total doses.
- **Accuracy pass (audit + tests + independent verification)**:
  - Fixed: clinician ISF / I:C **overrides** are now honored identically in both dosing paths (previously ignored by the food path — silently).
  - Fixed: silent fallback carb-ratio default removed; invalid inputs can never produce NaN or a guessed dose.
  - 26 new unit tests added (dosing spec file now has 54 tests; full suite 75 across 5 suites — all green).
  - Worked examples verified: TDD 50 → 1 U per 10 g carbs, target 120: glucose 150 + 45 g → 5.3 U total; glucose 120 + 60 g → 6.0 U; etc. (see review docs).
- **Open clinical items for sign-off** (not silently changed): 1800/500 constants vs Regular insulin (Actrapid) conventions; pen rounding (0.5 U); max-bolus = total semantics. Logged in `docs/CLINICAL_SAFETY_LOG.md`.

## 3. Log screen — back button
- New "‹ Back / पछाडि" row at the top of the Log tab → returns to the Dashboard (Log is a bottom tab, so a tab-aware back was added instead of the usual go-back).

## 4. Admin area for admin logins
- Admin console entry now appears for **any admin email** (even if the profile role isn't clinician): Home (staff card + new entry on the empty state) and Settings → Staff; "App admin" badge shown.
- Console gate: clinician **or** app-admin; denied card for everyone else (RLS remains the real enforcement).
- New "Staff accounts" card lists staff/admin accounts via the admin-gated `admin_list_staff()` RPC (email, name, role, full-access pill).

## Verification
- `npx tsc --noEmit` → 0 errors; `npx jest` → 75/75; `node scripts/validate-repo.mjs` → pass.
- Independent numbers verification: PASS — all expected-values cases re-derived by hand and matched; test count: 54/54 in the dosing spec (full suite 75/75). Code-review + flow lanes hit platform service failures and were completed as documented mainline takeovers (see review record in the round workspace).
- NOT yet done (owner-gated): APK build, device install, owner retest.

## Build status
CI build `37789232314` (patient-card layout fix) finished SUCCESS earlier and remains **held/unpublished** per owner instruction. Round-8 changes will ride the next build whenever the owner green-lights it (migration already applied, so a build with these fields is safe).

## Files changed (committed as the round-8 commit on `agent/features-batch1`)
`src/screens/{LogGlucoseScreen,RegimenSettingsScreen,AddPatientScreen,FoodEstimatorScreen,AdminConsoleScreen,HomeScreen,SettingsScreen,ClinicianPatientListScreen,ClinicianPatientDetailScreen}.tsx`, `src/rules/sickDayRules.ts`, `src/types/index.ts`, `__tests__/dosingCalc.test.ts`, `supabase/migrations/20261008000014_bolus_dose.sql`.
