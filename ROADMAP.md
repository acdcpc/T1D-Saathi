# T1D Saathi — Design & Improvement Roadmap

Source: design brief (Kapoori Ka design language + ISPAD 2022 clinical rules).
Note: some brief details are now outdated — vision pipeline is on-device TFLite (free),
NOT LogMeal/FatSecret; local food DB has grown beyond 22 items.

## Phase 1 — Safety & Trust (highest priority)
- [x] Sick-day hypo guard (never increase insulin when glucose < 70)
- [x] Clinician sign-off on dosing (warn + confirm)
- [ ] **One-tap emergency access from any screen (red SOS FAB)** ← in progress
- [ ] "Last synced" timestamp + pending-sync badge on Home (partly done)
- [ ] Prominent hypo alert with 15-15 Rule steps (EmergencyScreen)
- [ ] "Based on ISPAD 2022" compliance indicator on protocol screens

## Phase 2 — Navigation & Onboarding
- [ ] Bottom tab navigation: Home | Log | Food | Learn | Emergency (red)
- [ ] 3-4 screen onboarding flow (Nepali-first, first-time smartphone users)
- [ ] Splash screen with logo + "तपाईंको मधुमेह सहयात्री"

## Phase 3 — Visual & Cultural Authenticity
- [ ] Mukta font (Devanagari) + Inter (Latin) via expo-font
- [ ] Replace emoji with SVG icon set (Ionicons already available)
- [ ] Nepali cultural motifs (dhaka pattern dividers, mandala ornaments)
- [ ] Child-friendly illustrated avatars (boy/girl)
- [ ] Nepali number formatting option (१२३)

## Phase 4 — Clinical Credibility & Charts
- [ ] 7/30-day glucose trend charts (Victory Native, ISPAD 70-180 bands)
- [ ] Time-in-Range (TIR) donut on dashboard
- [ ] HbA1c estimator (eA1C = (mean glucose + 46.7) / 28.7)
- [ ] Insulin-on-board (IOB) decay indicator

## Phase 5 — Functional
- [ ] Push notification reminders (pre-meal, bedtime, sick-day hourly)
- [ ] PDF report export (expo-print + expo-sharing)
- [ ] Education progress tracking + caregiver certification
- [ ] Inline form validation (Nepali errors)
- [ ] Food DB expansion (50+ regional foods)
- [ ] Image compression before upload (<500KB)

## Phase 6 — Performance & Accessibility
- [ ] 48x48dp touch targets, font scaling to 200%, high-contrast mode
- [ ] Skeleton loaders, FlashList, pagination
- [ ] Error boundaries + crash reporting
- [ ] E2E tests (Detox)

## Never (safety)
- Never auto-adjust insulin without explicit confirmation
- Disclaimer visible on login + settings
- All dosing = advisory, clinician-verified
