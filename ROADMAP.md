# T1D Saathi — Design & Improvement Roadmap

Source: design brief (Kapoori Ka design language + ISPAD 2022 clinical rules).
Note: some brief details are now outdated — vision pipeline is on-device TFLite (free),
NOT LogMeal/FatSecret; local food DB has grown beyond 22 items.

## Phase 1 — Safety & Trust (highest priority)
- [x] Sick-day hypo guard (never increase insulin when glucose < 70)
- [x] Clinician sign-off on dosing (warn + confirm)
- [x] One-tap emergency access from any screen (red SOS FAB)
- [x] "Last synced" timestamp + pending-sync badge on Home
- [ ] Prominent hypo alert with 15-15 Rule steps (EmergencyScreen)
- [x] "Based on ISPAD 2022" compliance indicator on protocol screens

## Phase 2 — Navigation & Onboarding
- [x] Bottom tab navigation (patient-scoped: Home | Log | Food | Learn) + global Emergency FAB
- [x] 3-slide onboarding flow (Nepali-first)
- [x] Splash screen configured (expo-splash-screen); tagline art pending

## Phase 3 — Visual & Cultural Authenticity
- [x] Mukta font (Devanagari + Latin) loaded + applied globally
- [x] Replaced emoji with Ionicons (dashboard, emergency, education, home)
- [ ] Nepali cultural motifs (dhaka pattern dividers, mandala ornaments)
- [ ] Child-friendly illustrated avatars (boy/girl)
- [ ] Nepali number formatting option (१२३)

## Phase 4 — Clinical Credibility & Charts
- [x] 14-day glucose trend chart (react-native-svg, ISPAD 70-180 band)
- [x] Time-in-Range % + mean + eA1c stat tiles on dashboard
- [x] HbA1c estimator (ADAG formula)
- [x] Insulin-on-board (IOB) decay indicator

## Phase 5 — Functional
- [x] Push reminders: pre-meal (7/12/7) + bedtime (9 PM) toggles in Settings
- [x] PDF report export (expo-print + expo-sharing)
- [x] Education progress tracking (tap-to-complete + progress bar)
- [ ] Inline form validation (Nepali errors)
- [x] Food DB expansion (77 items incl. regional)
- [ ] Image compression before upload (<500KB)

## Phase 6 — Performance & Accessibility
- [ ] 48x48dp touch targets, font scaling to 200%, high-contrast mode
- [x] Skeleton loaders; FlashList/pagination pending
- [x] Error boundary (Nepali-friendly); Sentry/Crashlytics pending
- [ ] E2E tests (Detox)

## Never (safety)
- Never auto-adjust insulin without explicit confirmation
- Disclaimer visible on login + settings
- All dosing = advisory, clinician-verified
