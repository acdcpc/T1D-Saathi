# 🩺 T1D Saathi — Type 1 Diabetes Companion for Nepali Families

**T1D Saathi** is a mobile app built for Nepali children with Type 1 Diabetes and their families. It helps parents and caregivers track glucose, count carbs from photos of Nepali meals, follow ISPAD sick-day guidelines, find nearby health centers, and connect with clinicians — all in Nepali and English.

---

## Features

| Module | Description |
|--------|-------------|
| 📊 **Glucose Logging** | Log blood glucose in mg/dL or mmol/L with ISPAD-coded color badges |
| 📸 **Food Photo Estimator** | Take a photo → on-device AI classifies the food → matched to local Nepali DB for accurate macros → carb count → insulin dose calculator |
| 🏥 **Sick-Day Wizard** | ISPAD 2022–based step-by-step guide: glucose monitoring, ketone checks, DKA red screen |
| 🗺️ **Health Centers** | Curated map of diabetes-ready hospitals in Nepal with tap-to-call and directions |
| 📞 **Helpline** | One-tap call to Dr. Archana's diabetes helpline (9851350883) |
| 📚 **Education** | ISPAD-aligned modules: hypoglycemia protocol, carb counting, sick-day rules |
| ❓ **Quiz** | Knowledge check for caregivers with Nepali-language questions |
| 💬 **Messages** | In-app chat with clinicians (role-based access) |
| 🆘 **Emergency** | Red Alert screen with severe hypo/severe hyper/DKA protocols |
| 👩‍⚕️ **Clinician Portal** | Patient list with drill-down to glucose history, dosing review, regimen settings |

---

## Tech Stack

- **Frontend**: React Native + Expo SDK 57 + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Analytics**: Firebase (Analytics, Crashlytics, Cloud Messaging)
- **Vision**: Google AIY Food V1 TFLite model (2000+ classes, Apache 2.0) → Local Nepali food DB match → USDA FoodData Central (free) → Open Food Facts (free)
- **Calendar**: `nepali-date-converter` (Bikram Sambat date picker)

---

## Project Structure

```
src/
├── components/         # Reusable UI (BSDatePicker)
├── context/            # AuthContext, LanguageContext
├── data/               # Static data (nepaliFoods.ts — 22 items)
├── i18n/               # translations.ts (Nepali + English)
├── lib/                # supabase.ts (client init)
├── navigation/         # types.ts (route params)
├── rules/              # sickDayRules.ts (ISPAD 2022 thresholds)
├── screens/            # 17 screens
├── types/              # TypeScript interfaces
├── utils/              # dosingCalc, offlineQueue, useNetworkSync, visionAPI, visionEstimator
└── theme.ts            # Shared design tokens
```

### Key Screens

| Screen | Location | Purpose |
|--------|----------|---------|
| LoginScreen | `screens/LoginScreen.tsx` | Email + Google auth |
| HomeScreen | `screens/HomeScreen.tsx` | Patient list + FAB |
| PatientDashboard | `screens/PatientDashboard.tsx` | Stats hub with 9 action cards |
| LogGlucoseScreen | `screens/LogGlucoseScreen.tsx` | Glucose entry with unit toggle |
| FoodEstimatorScreen | `screens/FoodEstimatorScreen.tsx` | Photo → on-device AI classification → Nepali DB match → carb → dose |
| SickDayWizardScreen | `screens/SickDayWizardScreen.tsx` | ISPAD 3-step sick-day guide |
| HealthCentersScreen | `screens/HealthCentersScreen.tsx` | Map + hospital list |
| HelplineScreen | `screens/HelplineScreen.tsx` | One-tap emergency call |
| SettingsScreen | `screens/SettingsScreen.tsx` | Unit toggle, regimen settings |
| ClinicianPatientListScreen | `screens/ClinicianPatientListScreen.tsx` | Clinician patient roster |
| ClinicianPatientDetailScreen | `screens/ClinicianPatientDetailScreen.tsx` | Clinician deep-dive |
| EmergencyScreen | `screens/EmergencyScreen.tsx` | Red-alert protocol cards |

---

## Setup Instructions

### Prerequisites

- Node.js 22+
- npm
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### Quick Start

```bash
# Clone
git clone <repo-url>
cd T1D-Saathi

# Install
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase + Firebase keys

# Run
npx expo start
```

### Required Environment Variables

Create a `.env` file with these variables (see `.env.example` for template):

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `EXPO_PUBLIC_SUPABASE_PROJECT_REF` | Supabase project reference ID |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `EXPO_PUBLIC_FIREBASE_SENDER_ID` | Firebase sender ID |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_LOGMEAL_API_KEY` | **Removed from the mobile client; do not add provider secrets here** |
| `EXPO_PUBLIC_FATSECRET_CLIENT_ID` | **Removed from the mobile client; do not add provider credentials here** |
| `EXPO_PUBLIC_FATSECRET_CLIENT_SECRET` | **Never place this secret in Expo or a mobile build** |

### Database

The Supabase database schema is in `supabase_schema.sql` and migration files in `supabase/migrations/`. For the live `t1d-heal` project, follow [`docs/SUPABASE_MANUAL_MIGRATION.md`](docs/SUPABASE_MANUAL_MIGRATION.md) before using the app with patient data. Apply with:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

### Release documentation

- [`docs/SUPABASE_MANUAL_MIGRATION.md`](docs/SUPABASE_MANUAL_MIGRATION.md) — SQL Editor steps, verification, negative RLS tests, and rollback guidance.
- [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md) — detailed security, clinical-safety, offline-sync, UI, dependency, and release notes.
- [`docs/SECURITY_RELEASE_CHECKLIST.md`](docs/SECURITY_RELEASE_CHECKLIST.md) — pre-release checklist for code, database, clinical review, and mobile testing.

## Building APK

```bash
eas build --platform android --profile preview
```

---

## Known Limitations

- 🍽️ **Food Estimator**: Uses the on-device Google AIY Food V1 TFLite model mapped to the curated local Nepali food database; no food photo leaves the device. External provider APIs (LogMeal/FatSecret/USDA) are disabled until a privacy-reviewed server endpoint is configured. Manual Nepali-food entry remains available. Model requires an EAS dev-client build (not Expo Go).
- 📅 **Bikram Sambat**: BS date picker is available but some date fields still use Gregorian internally.
- 📡 **Offline Queue**: Glucose and meal logs queue locally when offline, but sync validation for conflict resolution is basic.
- 🔐 **Google Auth**: Requires manual configuration in Google Cloud Console (OAuth consent screen + redirect URIs).
- 📱 **iOS Build**: Not yet tested on iOS. Camera permissions and HealthKit integration pending.

---

## ⚠️ Clinical Safety Note

**This app is a companion tool, not a medical device.** Dose calculation now fails closed unless the current glucose, meal carbohydrates, and active clinician-approved regimen are present and valid. All dosing constants (ICR via 500 Rule, ISF via 1800 Rule, correction factors) and sick-day thresholds require formal clinician review and sign-off before use in actual patient care. A displayed result is not a prescription and must be verified by a qualified healthcare provider.

---

## Design System

T1D Saathi's visual design is aligned with the Kapoori Ka design language:
- **Palette**: Warm parchment backgrounds (`#F7F1EB`), clinical blue primary (`#1a73e8`), warm shadows (`#C4956A`)
- **Cards**: 16px border radius, warm shadow, off-white surface
- **Inputs**: 12px border radius, 1.5px warm border, 14px padding
- **Buttons**: 28px pill radius, blue primary, warm border outlines
- **Typography**: `#1A1A2E` near-black text, `#7A6E65` muted warm gray
- **Components**: Shared FAB, avatar, section header, pill badge patterns

See `src/theme.ts` for the full design token catalog.

---

## Pilot readiness

The repository branch currently treats photo recognition and dosing as safety-gated prototype features. Before a pilot, configure a privacy-reviewed server-side vision integration, approve regimen data through an authorized clinician workflow, apply all Supabase migrations, test RLS with unrelated accounts, and validate clinical copy with qualified diabetes professionals. Do not use the app for patient dosing until those controls are complete.

## License

All rights reserved. Contact the maintainer for licensing information.
