import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
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
}

// Platform-aware storage adapter
// SecureStore is native-only; web uses localStorage
const storageAdapter = (() => {
  if (Platform.OS !== 'web') {
    // Dynamic require so Metro doesn't bundle SecureStore for web
    const SecureStore = require('expo-secure-store');
    return {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    };
  }
  // Web: use localStorage
  return {
    getItem: (key: string) => {
      if (typeof localStorage === 'undefined') return Promise.resolve(null);
      return Promise.resolve(localStorage.getItem(key));
    },
    setItem: (key: string, value: string) => {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return Promise.resolve();
    },
  };
})();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Export for startup diagnostics
export { supabaseUrl, supabaseAnonKey };
