# 🩺 T1D Saathi — Type 1 Diabetes Companion for Nepali Families

**T1D Saathi** is a mobile app built for Nepali children with Type 1 Diabetes and their families. It helps parents and caregivers track glucose, count carbs from photos of Nepali meals, follow ISPAD sick-day guidelines, find nearby health centers, and connect with clinicians — all in Nepali and English.

---

## Features

| Module | Description |
|--------|-------------|
| 📊 **Glucose Logging** | Log blood glucose in mg/dL or mmol/L with ISPAD-coded color badges |
| 📸 **Food Photo Estimator** | Take a photo of a Nepali meal → AI estimates items/portions → carb count → insulin dose calculator |
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
- **Vision**: LogMeal API / FatSecret API (food photo recognition)
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
| FoodEstimatorScreen | `screens/FoodEstimatorScreen.tsx` | Photo → vision → carb → dose |
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
| `EXPO_PUBLIC_LOGMEAL_API_KEY` | LogMeal vision API key (optional) |
| `EXPO_PUBLIC_FATSECRET_CLIENT_ID` | FatSecret OAuth client ID (optional) |
| `EXPO_PUBLIC_FATSECRET_CLIENT_SECRET` | FatSecret OAuth client secret (optional) |

### Database

The Supabase database schema is in `supabase_schema.sql` and migration files in `supabase/migrations/`. Apply with:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

### Building APK

```bash
eas build --platform android --profile preview
```

---

## Known Limitations

- 🍽️ **Food Estimator**: Photo recognition uses a hybrid pipeline (LogMeal → FatSecret → local Nepali DB fallback). Accuracy depends on API availability. Vision model is not yet tuned specifically for Nepali cuisine.
- 📅 **Bikram Sambat**: BS date picker is available but some date fields still use Gregorian internally.
- 📡 **Offline Queue**: Glucose and meal logs queue locally when offline, but sync validation for conflict resolution is basic.
- 🔐 **Google Auth**: Requires manual configuration in Google Cloud Console (OAuth consent screen + redirect URIs).
- 📱 **iOS Build**: Not yet tested on iOS. Camera permissions and HealthKit integration pending.

---

## ⚠️ Clinical Safety Note

**This app is a companion tool, not a medical device.** All dosing constants (ICR via 500 Rule, ISF via 1800 Rule, correction factors) and sick-day thresholds follow ISPAD 2022 Clinical Practice Consensus Guidelines but **require clinician review and sign-off before use in actual patient care**. Dosing recommendations should always be verified by a qualified healthcare provider.

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

## License

All rights reserved. Contact the maintainer for licensing information.
