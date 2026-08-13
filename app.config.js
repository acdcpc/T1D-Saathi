// app.config.js — Reads credentials from .env at build time
// Expo loads .env automatically; config is the resolved expo object
// EAS builds: also configure these as EAS secrets on expo.dev

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    'expo-font',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow T1D Saathi to access your camera to scan food barcodes.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7F1EB',
        image: './assets/splash-icon.png',
        imageWidth: 200,
      },
    ],
  ],
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    projectRef: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF || '',
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
    firebaseSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID || '',
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  },
});
