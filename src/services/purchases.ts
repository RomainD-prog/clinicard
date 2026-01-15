import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
} from "react-native-purchases";

// ⚠️ REMPLACER PAR TES VRAIES CLÉS REVENUECAT
const REVENUECAT_API_KEY_IOS = "appl_YOUR_IOS_KEY"; // À récupérer sur RevenueCat
const REVENUECAT_API_KEY_ANDROID = "goog_YOUR_ANDROID_KEY"; // À récupérer sur RevenueCat

let isInitialized = false;

/**
 * Initialise RevenueCat
 * À appeler au démarrage de l'app (dans _layout.tsx)
 */
export async function initPurchases(userId?: string) {
  if (isInitialized) return;

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG); // En prod : LOG_LEVEL.INFO

    // Configure selon la plateforme
    if (require("react-native").Platform.OS === "ios") {
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY_IOS,
        appUserID: userId,
      });
    } else {
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY_ANDROID,
        appUserID: userId,
      });
    }

    isInitialized = true;
    console.log("[Purchases] ✅ RevenueCat initialisé");
  } catch (e) {
    console.error("[Purchases] ❌ Erreur init RevenueCat:", e);
  }
}

/**
 * Récupère les informations client (abonnement actif, etc.)
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (e) {
    console.error("[Purchases] Erreur getCustomerInfo:", e);
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a un abonnement actif
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;

    // Vérifie si l'entitlement "premium" est actif
    return (
      typeof customerInfo.entitlements.active["premium"] !== "undefined"
    );
  } catch (e) {
    console.error("[Purchases] Erreur hasActiveSubscription:", e);
    return false;
  }
}

/**
 * Récupère les offres disponibles (produits à vendre)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    console.error("[Purchases] Erreur getOfferings:", e);
    return null;
  }
}

/**
 * Lance l'achat d'un produit
 */
export async function purchasePackage(
  packageToPurchase: any
): Promise<{ success: boolean; customerInfo?: CustomerInfo }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    console.log("[Purchases] ✅ Achat réussi");
    return { success: true, customerInfo };
  } catch (e: any) {
    if (e.userCancelled) {
      console.log("[Purchases] ⏸️ Achat annulé par l'utilisateur");
      return { success: false };
    }
    console.error("[Purchases] ❌ Erreur achat:", e);
    return { success: false };
  }
}

/**
 * Restaure les achats précédents
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log("[Purchases] ✅ Achats restaurés");
    return { success: true, customerInfo };
  } catch (e) {
    console.error("[Purchases] ❌ Erreur restore:", e);
    return { success: false };
  }
}

/**
 * Identifie l'utilisateur (après login)
 */
export async function identifyUser(userId: string) {
  try {
    await Purchases.logIn(userId);
    console.log("[Purchases] ✅ Utilisateur identifié:", userId);
  } catch (e) {
    console.error("[Purchases] ❌ Erreur login:", e);
  }
}

/**
 * Déconnecte l'utilisateur (après logout)
 */
export async function logoutUser() {
  try {
    await Purchases.logOut();
    console.log("[Purchases] ✅ Utilisateur déconnecté");
  } catch (e) {
    console.error("[Purchases] ❌ Erreur logout:", e);
  }
}
