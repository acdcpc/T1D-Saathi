// app.config.js — Reads credentials from .env at build time
// Expo loads .env automatically (never commit real keys)
// EAS builds: configure these as EAS secrets on expo.dev

module.exports = ({ config }) => {
  return {
    ...config,
    expo: {
      ...config.expo,
      extra: {
        ...config.expo.extra,
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        projectRef: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF || '',
        firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
        firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
        firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
        firebaseSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID || '',
        firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      },
    },
  };
};
