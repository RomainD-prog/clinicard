// src/config/env.ts
import { Platform } from "react-native";

// Tu peux mettre ces vars dans app.config.js / app.json via "extra" ou via env Expo
// - EXPO_PUBLIC_API_BASE_URL : URL de prod (https://api.tonapp.com)
// - EXPO_PUBLIC_DEV_API_HOST : IP/host de ton backend en dev (ex: 192.168.1.90)
// - EXPO_PUBLIC_MOCK_API : "true" | "false"

function normalizeBaseUrl(u: string) {
  return u.replace(/\/$/, "");
}

// Heuristique dev si aucune URL n'est définie
function defaultDevBaseUrl() {
  // iOS simulator = localhost ok (si backend tourne sur le même Mac)
  if (Platform.OS === "ios") return "http://localhost:3333";

  // Android emulator : localhost = machine émulée, donc on utilise 10.0.2.2 (Android Studio)
  // si tu es sur emulator Android Studio, c'est le bon mapping vers ton Mac.
  // (Sur Genymotion: 10.0.3.2)
  if (Platform.OS === "android") return "http://10.0.2.2:3333";

  // fallback général
  return "http://localhost:3333";
}

// ✅ prod > dev host > fallback intelligent
const PROD_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const DEV_HOST = process.env.EXPO_PUBLIC_DEV_API_HOST; // ex: "192.168.1.90"
const DEV_URL = DEV_HOST ? `http://${DEV_HOST}:3333` : defaultDevBaseUrl();

export const API_BASE_URL = normalizeBaseUrl(PROD_URL ?? DEV_URL);

// Mock: en prod => false par défaut
const rawMock = process.env.EXPO_PUBLIC_MOCK_API;
export const MOCK_API = (rawMock ?? (__DEV__ ? "false" : "false")) === "true";

export const FREE_IMPORTS_LIMIT = 3;
export const MAX_PAGES_PER_IMPORT = 30;

// credits MVP
export const CREDITS_PER_IMPORT = 1;

// RevenueCat (in-app purchases)
export const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || "";
export const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || "";
export const REVENUECAT_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "pro";
