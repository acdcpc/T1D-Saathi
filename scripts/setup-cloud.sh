#!/bin/bash
set -e

echo "============================================"
echo "  T1D Saathi - Cloud Project Setup"
echo "============================================"

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# --- Firebase ---
echo ""
echo ">> Step 1: Firebase Login"
firebase login
echo ""

echo ">> Step 2: Create Firebase project 'T1D-heal'"
firebase projects:create T1D-heal-$(date +%s) --display-name "T1D Saathi" || {
  echo "Project may already exist, listing existing:"
  firebase projects:list
  echo ""
  read -p "Enter existing Firebase project ID (or CTRL+C to abort): " FIREBASE_PROJECT_ID
  firebase use "$FIREBASE_PROJECT_ID"
}
echo ""

echo ">> Step 3: Add Firebase Web App"
firebase apps:create web T1D-Saathi
echo ""

echo ">> Step 4: Get Firebase config"
firebase apps:sdkconfig web --json > firebase-config.json 2>/dev/null || {
  echo "Copy the Firebase config from the console and paste below:"
  read -p "API Key: " FIREBASE_API_KEY
  read -p "Project ID: " FIREBASE_PROJECT_ID
  read -p "App ID: " FIREBASE_APP_ID
  read -p "Messaging Sender ID: " FIREBASE_SENDER_ID
  cat > firebase-config.json << EOF
{
  "apiKey": "$FIREBASE_API_KEY",
  "authDomain": "$FIREBASE_PROJECT_ID.firebaseapp.com",
  "projectId": "$FIREBASE_PROJECT_ID",
  "storageBucket": "$FIREBASE_PROJECT_ID.appspot.com",
  "messagingSenderId": "$FIREBASE_SENDER_ID",
  "appId": "$FIREBASE_APP_ID"
}
EOF
}
echo ""

echo "--- Supabase ---"
echo ""
echo ">> Step 5: Supabase Login"
supabase login
echo ""

echo ">> Step 6: Create Supabase project 't1d-heal'"
supabase projects create t1d-heal --plan free --org "$(supabase orgs list --output json 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["id"])' 2>/dev/null || echo default)" --db-pass "T1D_saathi_admin_2026!" 2>&1
echo ""

echo ">> Step 7: Link Supabase to local project"
supabase link --project-ref "$(supabase projects list --output json 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print([p for p in d if "t1d" in p.get("name","").lower()][0]["id"])')" 2>&1 || {
  echo "Enter the Supabase project reference ID:"
  read -p "Ref: " SUPABASE_REF
  supabase link --project-ref "$SUPABASE_REF"
}
echo ""

echo ">> Step 8: Run database schema"
supabase db push --linked 2>&1 || {
  echo "Schema push via CLI failed. Run the SQL manually:"
  echo "  1. Go to: https://supabase.com/dashboard"
  echo "  2. Open your project > SQL Editor"
  echo "  3. Paste contents of supabase_schema.sql"
  echo "  4. Click RUN"
}
echo ""

echo ">> Step 9: Get Supabase credentials"
supabase status 2>&1 | head -20
echo ""
echo "Credentials are also in: supabase/.env (or project dashboard)"
echo ""

echo "============================================"
echo "  SETUP COMPLETE"
echo "============================================"
echo ""
echo "Now add these to the project .env file:"
echo "  EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co"
echo "  EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-dashboard>"
echo "  EXPO_PUBLIC_FIREBASE_API_KEY=<api-key>"
echo "  EXPO_PUBLIC_FIREBASE_PROJECT_ID=<project-id>"
echo ""
echo "Then run:"
echo "  cd T1D-Saathi"
echo "  npx expo start"
