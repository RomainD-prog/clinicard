import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

import {
  REVENUECAT_ANDROID_API_KEY,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_IOS_API_KEY,
} from "../config/env";
import * as repo from "../storage/repo";

/**
 * RevenueCat wrapper
 *
 * - configure once at app start (anonymous is fine)
 * - optionally logIn/logOut when your auth state changes (Supabase)
 * - keep local KV + zustand in sync via repo.setSubscribed(...)
 */

let configured = false;
let listenerAttached = false;

function getApiKey() {
  const key = Platform.OS === "ios" ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;
  return String(key || "").trim();
}

function isProFromCustomerInfo(info?: CustomerInfo | null) {
  if (!info) {
    console.log("[purchases] 🔍 No CustomerInfo");
    return false;
  }
  const entId = String(REVENUECAT_ENTITLEMENT_ID || "pro").trim();
  const active = info.entitlements?.active || {};
  
  // 🐛 Debug logs
  console.log("[purchases] 🔍 Checking entitlement:", entId);
  console.log("[purchases] 🔍 Active entitlements:", Object.keys(active));
  console.log("[purchases] 🔍 All entitlements:", Object.keys(info.entitlements?.all || {}));
  
  const isPro = Boolean(active?.[entId]);
  console.log("[purchases] 🔍 Is Pro?", isPro);
  
  return isPro;
}

async function persistPro(isPro: boolean) {
  try {
    await repo.setSubscribed(Boolean(isPro));
  } catch (e) {
    console.warn("[purchases] persist subscribed failed:", e);
  }
}

export async function configurePurchases() {
  if (configured) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(
      "[purchases] RevenueCat key missing. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY."
    );
    configured = true; // avoid spamming logs
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.INFO);

  // anonymous by default (you can logIn later)
  Purchases.configure({ apiKey });

  configured = true;

  // ✅ one immediate refresh sans récursion
  try {
    const info = await Purchases.getCustomerInfo();
    await persistPro(isProFromCustomerInfo(info));
  } catch (e) {
    console.warn("[purchases] initial getCustomerInfo failed:", e);
  }

  attachCustomerInfoListener();
}

export function attachCustomerInfoListener() {
  if (listenerAttached) return;

  try {
    Purchases.addCustomerInfoUpdateListener(async (info) => {
      const isPro = isProFromCustomerInfo(info);
      await persistPro(isPro);
    });
    listenerAttached = true;
  } catch (e) {
    console.warn("[purchases] listener attach failed:", e);
  }
}

export async function identifyUser(userId: string) {
  await configurePurchases();
  if (!userId) return;

  try {
    const { customerInfo } = await Purchases.logIn(String(userId));
    await persistPro(isProFromCustomerInfo(customerInfo));
  } catch (e) {
    console.warn("[purchases] logIn failed:", e);
    // not fatal: purchases still works in anonymous mode
  }
}

export async function logoutUser() {
  await configurePurchases();
  try {
    const info = await Purchases.logOut();
    await persistPro(isProFromCustomerInfo(info));
  } catch (e) {
    console.warn("[purchases] logOut failed:", e);
  }
}

export async function refreshSubscription() {
  await configurePurchases();
  try {
    const info = await Purchases.getCustomerInfo();
    const isPro = isProFromCustomerInfo(info);
    await persistPro(isPro);
    return isPro;
  } catch (e) {
    console.warn("[purchases] getCustomerInfo failed:", e);
    return false;
  }
}

export async function getOfferings(): Promise<PurchasesOffering[]> {
  await configurePurchases();
  const o = await Purchases.getOfferings();
  return o.all ? Object.values(o.all) : [];
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  await configurePurchases();
  const result = await Purchases.purchasePackage(pkg);
  const info = result.customerInfo;
  await persistPro(isProFromCustomerInfo(info));
  return info;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  await configurePurchases();
  const info = await Purchases.restorePurchases();
  await persistPro(isProFromCustomerInfo(info));
  return info;
}

export async function openManageSubscriptions() {
  await configurePurchases();
  try {
    // Opens the OS subscription management screen (best-effort)
    // @ts-ignore
    await Purchases.showManageSubscriptions();
  } catch {
    // ignore on platforms/versions that don't support it
  }
}
