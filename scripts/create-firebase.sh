#!/bin/bash
# Run this in your terminal: bash scripts/create-firebase.sh

echo "1. Login to Firebase..."
firebase login

echo "2. Creating project T1D-heal..."
firebase projects:create T1D-heal-np --display-name "T1D Saathi" 2>/dev/null || {
  echo "Project may exist. Listing yours:"
  firebase projects:list
  read -p "Enter Firebase project ID: " FIREBASE_ID
  firebase use "$FIREBASE_ID"
}

echo "3. Creating web app..."
firebase apps:create web T1D-Saathi 2>/dev/null || echo "App may exist."

echo "4. Getting config..."
firebase apps:sdkconfig web --json 2>/dev/null || {
  echo "✓ Go to Firebase Console > Project Settings > General"
  echo "✓ Copy the Web App config"
  echo "✓ Paste into .env under EXPO_PUBLIC_FIREBASE_* vars"
}

echo "DONE! Now configure Firebase Auth providers at:"
echo "  https://console.firebase.google.com"
echo ""
echo "Add to .env:"
echo "  EXPO_PUBLIC_FIREBASE_API_KEY=***"
echo "  EXPO_PUBLIC_FIREBASE_PROJECT_ID=***"
echo "  EXPO_PUBLIC_FIREBASE_APP_ID=***"
