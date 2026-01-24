// src/services/purchases.ts
import Constants from "expo-constants";
import { Platform } from "react-native";

export type CustomerInfo = any;
export type PurchasesOffering = any;

const isExpoGo = Constants.appOwnership === "expo";

let cachedModule: any | null = null;

async function loadPurchases() {
  if (isExpoGo) return null;
  if (cachedModule) return cachedModule;

  try {
    // Lazy import => pas de crash Expo Go
    const mod = await import("react-native-purchases");
    cachedModule = mod;
    return mod;
  } catch (e) {
    console.warn("[Purchases] Module unavailable (dev build required).", e);
    return null;
  }
}

export async function initPurchases(appUserId: string) {
  const mod = await loadPurchases();
  if (!mod) return;

  const Purchases = mod.default;
  const LOG_LEVEL = mod.LOG_LEVEL;

  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  });

  if (!apiKey) {
    console.warn(`[Purchases] Missing RevenueCat API key env var for ${Platform.OS}.`);
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.INFO);
  await Purchases.configure({ apiKey, appUserID: appUserId });
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  const mod = await loadPurchases();
  if (!mod) return null;
  return mod.default.getOfferings();
}

export async function purchasePackage(pkg: any): Promise<CustomerInfo | null> {
  const mod = await loadPurchases();
  if (!mod) return null;
  const { customerInfo } = await mod.default.purchasePackage(pkg);
  return customerInfo ?? null;
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  const mod = await loadPurchases();
  if (!mod) return null;
  return mod.default.restorePurchases();
}

export async function hasActiveSubscription(): Promise<boolean> {
  const mod = await loadPurchases();
  if (!mod) return false;

  const info: any = await mod.default.getCustomerInfo();
  const active = info?.entitlements?.active;
  return !!(active && Object.keys(active).length > 0);
}
