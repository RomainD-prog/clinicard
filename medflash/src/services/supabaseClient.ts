// src/services/supabaseClient.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const isWeb = Platform.OS === "web";
const isBrowser =
  isWeb && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const isWebSSR = isWeb && (typeof window === "undefined" || typeof document === "undefined");

const storage = {
  getItem: async (key: string) => {
    if (isBrowser) return window.localStorage.getItem(key);
    if (isWebSSR) return null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (isBrowser) return void window.localStorage.setItem(key, value);
    if (isWebSSR) return;
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (isBrowser) return void window.localStorage.removeItem(key);
    if (isWebSSR) return;
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: isBrowser, // false sur mobile
    flowType: "pkce", // required for OAuth on native (exchangeCodeForSession)
  },
});
