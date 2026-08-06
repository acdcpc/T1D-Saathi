// app.config.js — Reads credentials from .env at build time
// NEVER contains hardcoded secrets — they stay in .env (gitignored)
// EAS builds: configure these as EAS secrets instead of .env

const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Read static app.json as base
const appJson = require('./app.json');

module.exports = ({ config }) => {
  return {
    ...config,
    expo: {
      ...config.expo,
      extra: {
        ...config.expo.extra,
        // Supabase
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        projectRef: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF || '',
        // Firebase
        firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
        firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
        firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
        firebaseSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID || '',
        firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      },
    },
  };
};
