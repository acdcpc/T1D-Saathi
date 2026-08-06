# T1D Saathi — Full Setup Instructions

## Quick Start (you need to run these in your Terminal, not here)

### 1. Create Firebase Project "T1D-heal"

```bash
# Open terminal and login
firebase login

# Create the project
firebase projects:create t1d-heal-2026 --display-name "T1D Saathi"

# Add web app to get Firebase config
firebase apps:create web T1D-Saathi

# Get the config values
firebase apps:sdkconfig web --json
```

Save the output (API key, project ID, app ID, sender ID).

### 2. Create Supabase Project "t1d-heal"

```bash
# Login
supabase login

# Create project (opens browser)
# Go to https://supabase.com/dashboard and click "New Project"
# Name: t1d-heal
# Database Password: Set a strong password
# Region: Southeast Asia (Singapore) — closest to Nepal
```

### 3. After Supabase project is created

Copy the project URL and anon key from Settings > API.

### 4. Set up the database

Open your Supabase project dashboard → SQL Editor → paste and run `supabase_schema.sql`.

### 5. Configure the app

Edit `/Users/prakashthapa/Downloads/Heal-diabetes/T1D-Saathi/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://t1d-heal.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJh...your-actual-key
EXPO_PUBLIC_FIREBASE_API_KEY=AIz...your-api-key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=t1d-heal-2026
EXPO_PUBLIC_FIREBASE_APP_ID=1:...your-app-id
```

### 6. Run the app

```bash
cd /Users/prakashthapa/Downloads/Heal-diabetes/T1D-Saathi
npx expo start
```

Then scan the QR code with Expo Go on your phone.

## What's Already Done

✅ Full Expo React Native app with 13+ screens  
✅ ISPAD clinical rules engine (sick day management)  
✅ Nepali + English localization  
✅ Supabase schema (RLS, care_team, triggers)  
✅ Firebase config stubs  
✅ TypeScript compiles with zero errors  
✅ Environment config files ready  
✅ Setup script in `scripts/setup-cloud.sh`

## What Needs Your Terminal

🔲 Create Firebase project via `firebase projects:create`  
🔲 Create Supabase project at supabase.com  
🔲 Run `supabase_schema.sql` in Supabase SQL Editor  
🔲 Fill in `.env` with actual API keys  
🔲 Configure Firebase Authentication (Google + Email) in Firebase Console  
🔲 Configure Supabase Auth (Google provider + redirect URL) in Supabase Dashboard  
