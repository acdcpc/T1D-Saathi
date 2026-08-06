# T1D Saathi — Type 1 Diabetes Management App for Nepali Children

A mobile application that helps children with Type 1 Diabetes (T1D) and their families in **resource-limited settings in Nepal** understand, monitor, and manage the condition day-to-day, with a dedicated interface for sick-day management and a companion clinician view.

## Tech Stack

- **Frontend**: React Native + Expo SDK 57 + TypeScript
- **Navigation**: React Navigation (Native Stack)
- **Backend**: Supabase (Postgres + Auth + Storage + RLS)
- **Charts**: Victory Native
- **Dates**: nepali-date-converter (Bikram Sambat / Gregorian)
- **Notifications**: expo-notifications
- **Localization**: Nepali (नेपाली) + English with `LanguageContext`

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Supabase account & project

### Installation

```bash
cd T1D-Saathi
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

1. Go to your Supabase project SQL Editor
2. Run the contents of `supabase_schema.sql`
3. Set up Auth providers (Email, Google OAuth)
4. Create a Storage bucket `patient-documents`

### Run

```bash
npx expo start
```

Press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go.

## Project Structure

```
T1D-Saathi/
├── App.tsx                    # Root with Navigation + Auth/Language providers
├── supabase_schema.sql        # Database schema to run in Supabase
├── src/
│   ├── types/index.ts         # All TypeScript types
│   ├── i18n/translations.ts   # English + Nepali translations
│   ├── lib/supabase.ts        # Supabase client + SecureStore adapter
│   ├── context/
│   │   ├── AuthContext.tsx     # Auth state (email, Google, guest)
│   │   └── LanguageContext.tsx # en/ne language switching
│   ├── rules/
│   │   └── sickDayRules.ts    # ISPAD clinical rules engine
│   ├── navigation/types.ts    # Route param types
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── HomeScreen.tsx
│       ├── AddPatientScreen.tsx
│       ├── PatientDashboard.tsx
│       ├── LogGlucoseScreen.tsx
│       ├── SickDayWizardScreen.tsx
│       ├── EducationScreen.tsx
│       ├── QuizScreen.tsx
│       ├── MessagesScreen.tsx
│       ├── EmergencyScreen.tsx
│       ├── SettingsScreen.tsx
│       ├── RegimenSettingsScreen.tsx
│       ├── ClinicianPatientListScreen.tsx
│       └── ClinicianPatientDetailScreen.tsx
```

## Screens Built (13 screens)

| Screen | Purpose | Key Features |
|--------|---------|--------------|
| Login | Auth | Email, Google, Guest sign-in |
| Home | Patient list | Pull-to-refresh, empty state, FAB |
| AddPatient | Profile onboarding | Chip selectors, comorbid checklist |
| PatientDashboard | Main hub | Glucose card, hypo alert, sick day banner, 6 quick actions |
| LogGlucose | Glucose entry | mg/dL / mmol/L toggle, ISF/carb calculation, hypo branch + 20-min notification |
| SickDayWizard | 3-step sick day | Symptoms → Ketones → ISPAD guidance with emergency escalation |
| Education | Video library | Topic list with audience tags, quiz access |
| Quiz | Pre/post assessment | 5 sample questions, score display |
| Messages | Chat | Real-time Supabase subscriptions |
| Emergency | Hospital info | One-tap call, DKA signs checklist |
| Settings | App config | Language (en/ne), units info, logout |
| RegimenSettings | Insulin config | ISF, carb ratio, TDD, correction target |
| ClinicianPatientList | Doctor view | Assigned patients via care_team RLS |
| ClinicianPatientDetail | Patient detail | Glucose/ketone/sick day history with alerts |

## Clinical Safety

- All sick day thresholds from **ISPAD 2022 guideline** (Phelan et al., Pediatric Diabetes)
- Hypoglycemia: < 70 mg/dL triggers immediate treatment protocol + 20-minute recheck notification
- DKA escalation: Ketones ≥ 3.0 mmol/L or any red-flag triggers emergency screen
- Rules engine is **data-driven** — thresholds configurable via `sickDayRules.ts` without app changes
- Disclaimer on all clinically-used screens
- Clinician review required before production release

## Customization Guide

- **Change brand/colors**: Edit `#1a73e8` (primary blue) and `#ea4335` (emergency red) across all screen files
- **Add languages**: Add entries to `src/i18n/translations.ts`, register key in LanguageContext
- **Modify clinical thresholds**: Edit `src/rules/sickDayRules.ts`
- **Change units default**: Default is mg/dL — modify unit toggle defaults in LogGlucoseScreen and SettingsScreen
- **Update Supabase URL**: Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- **Deploy**: Use `eas build --profile preview` for APK, `eas submit` for stores

## Quality Coverage

- ✅ Desktop + mobile responsive via flexbox layouts
- ✅ Empty states for all lists (no patients, no logs, no messages)
- ✅ Loading indicators on all async screens
- ✅ Error handling with Alert dialogs
- ✅ Touch targets ≥ 44px throughout
- ✅ Chip/toggle selectors with active states
- ✅ Hypo emergency (red) visual treatment
- ✅ Step indicators in wizard flows
- ✅ Nepali language support (partial — clinical content prioritized)
- ✅ Pull-to-refresh on list screens

## Next Steps (post scaffolding)

1. Wire up `expo-notifications` for hypo recheck and sick-day monitoring reminders
2. Implement offline-first buffer (SQLite/AsyncStorage queue → Supabase sync)
3. Add BS/AD date picker with `nepali-date-converter`
4. Complete Nepali translations (current: all UI labels + hypo content)
5. Deploy to Supabase, test auth + RLS flows
6. Add unit tests for clinical rules engine
7. Firebase Analytics/Crashlytics integration
