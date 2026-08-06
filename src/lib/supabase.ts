import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Read from Expo Constants (set in app.json extra) with process.env fallback for dev
const extra = Constants.expoConfig?.extra || {};

const supabaseUrl =
  extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// Config check — fail early with a clear message
if (!supabaseUrl || !supabaseAnonKey) {
  const msg = '[T1D Saathi] Supabase not configured. Ensure supabaseUrl and supabaseAnonKey are set in app.json extra or .env.';
  console.error(msg);
  // In production, this should show a user-friendly screen, not crash
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export for startup diagnostics
export { supabaseUrl, supabaseAnonKey };
