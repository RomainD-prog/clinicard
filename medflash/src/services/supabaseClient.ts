// src/services/supabaseClient.ts
// Supabase client initialisation compatible avec Expo (native + web).
// - React Native: persiste la session via expo-secure-store
// - Web (browser): persiste via localStorage
// - SSR / Node (expo-router rendering): storage no-op (evite SecureStore en Node)

import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Detecte un vrai runtime React Native (Expo Go / dev client)
const isReactNative =
  typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative';

// Vrai uniquement dans un navigateur (pas dans le runtime Node de expo-router)
const isBrowser = Platform.OS === 'web' && typeof window !== 'undefined';

// Tout ce qui n'est ni RN ni un vrai browser: on considere que c'est Node/SSR
const isServer = !isReactNative && !isBrowser;

// Import de SecureStore uniquement en runtime React Native
let SecureStore: typeof import('expo-secure-store') | null = null;
if (isReactNative && Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
}

const storage = {
  async getItem(key: string) {
    if (isBrowser) return window.localStorage.getItem(key);
    if (isServer || !SecureStore) return null;
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (isBrowser) {
      window.localStorage.setItem(key, value);
      return;
    }
    if (isServer || !SecureStore) return;
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (isBrowser) {
      window.localStorage.removeItem(key);
      return;
    }
    if (isServer || !SecureStore) return;
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    // Sur web browser: true (OAuth/PKCE), sur natif: false
    detectSessionInUrl: isBrowser,
  },
});
