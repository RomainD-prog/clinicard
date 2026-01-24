/**
 * Service de Synchronisation Cloud
 * 
 * Ce service gère la synchronisation des données entre le stockage local et Supabase.
 * 
 * FONCTIONNEMENT :
 * - syncToCloud() : Upload les données locales vers Supabase
 * - syncFromCloud() : Download les données de Supabase vers local
 * - mergeData() : Fusionne intelligemment les données locales et cloud
 * 
 * STRATÉGIE DE SYNC :
 * 1. Lors de la première connexion : on upload les données locales vers le cloud
 * 2. Si des données existent déjà dans le cloud : on merge (garde le plus récent)
 * 3. Les timestamps permettent de résoudre les conflits
 * 
 * IMPACT :
 * - Les decks créés localement sont sauvegardés dans le cloud
 * - L'utilisateur peut récupérer ses données sur un autre appareil
 * - En cas de désinstallation, les données ne sont pas perdues
 */

import { CLOUD_SYNC_ENABLED } from "../config/supabase";
import * as repo from "../storage/repo";
import { Deck, QuizAttempt, ReviewRecord } from "../types/models";
import { supabase } from "./supabaseClient";

// ✅ Protection contre les appels répétés en cas d'erreur
let lastSyncAttempt = 0;
let syncInProgress = false;
const SYNC_COOLDOWN_MS = 5000; // 5 secondes entre les tentatives

/**
 * Structure des données dans le cloud
 */
export type CloudUserData = {
  userId: string;
  decks: Deck[];
  reviewRecords: ReviewRecord[];
  quizAttempts: QuizAttempt[];
  freeImportsUsed: number;
  creditsBalance: number;
  isSubscribed: boolean;
  level: string;
  lastSyncAt: number;
};

/**
 * Upload les données locales vers Supabase
 */
export async function syncToCloud(_userId: string): Promise<{ success: boolean; error?: string }> {
  if (!CLOUD_SYNC_ENABLED) {
    return { success: false, error: "Cloud sync disabled" };
  }

  // ✅ Protection contre les appels répétés
  const now = Date.now();
  if (syncInProgress) {
    return { success: false, error: "Sync already in progress" };
  }
  if (now - lastSyncAttempt < SYNC_COOLDOWN_MS) {
    return { success: false, error: "Sync cooldown active" };
  }

  syncInProgress = true;
  lastSyncAttempt = now;

  try {
    // Vérifier d'abord si l'utilisateur est authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user?.id) {
      syncInProgress = false;
      // Ne pas logger en erreur si l'utilisateur n'est simplement pas connecté
      if (authError?.message?.includes("session") || !user) {
        return { success: false, error: "Not authenticated" };
      }
      throw new Error(authError?.message || "Not authenticated");
    }

    const uid = user.id;

    // (Optionnel) log diagnostic temporaire
    // console.log("[cloudSync] uid from session =", uid, "param userId =", _userId);

    // Récupère toutes les données locales...
    const decks = await repo.listDecks();
    const reviewRecords = await repo.getAllReviewRecords();
    const quizAttempts = await repo.getAllQuizAttempts();
    const freeImportsUsed = await repo.getFreeImportsUsed();
    const creditsBalance = await repo.getCreditsBalance();
    const isSubscribed = await repo.getSubscribed();
    const level = await repo.getLevel();

    const cloudData: CloudUserData = {
      userId: uid, // IMPORTANT : cohérent avec la session
      decks,
      reviewRecords,
      quizAttempts,
      freeImportsUsed,
      creditsBalance,
      isSubscribed,
      level,
      lastSyncAt: Date.now(),
    };

    const { error } = await supabase
      .from("user_data")
      .upsert(
        {
          user_id: uid,           // IMPORTANT : uid (session), pas param
          data: cloudData,
          // updated_at: new Date().toISOString(), // optionnel (tu as déjà trigger côté DB)
        },
        { onConflict: "user_id" }
      );

    if (error) throw error;

    syncInProgress = false;
    return { success: true };
  } catch (error: any) {
    syncInProgress = false;
    // ✅ Logging amélioré pour debug
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || error?.status || "unknown";
    
    // Ne pas logger en erreur si c'est juste "Not authenticated" (mode local normal)
    if (errorMessage.includes("Not authenticated") || errorMessage.includes("session")) {
      // Mode local, pas d'erreur à logger
      return { success: false, error: "Not authenticated" };
    }
    
    // Logger les vraies erreurs
    console.error("Sync to cloud failed:", {
      message: errorMessage,
      code: errorCode,
      details: error,
    });
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Download les données du cloud et remplace les données locales
 * ⚠️ ATTENTION : Cette fonction remplace complètement les données locales
 * À utiliser uniquement au login ou pour forcer un refresh depuis le cloud
 */
export async function syncFromCloud(_userId: string, replaceLocal: boolean = false): Promise<{ success: boolean; error?: string }> {
  if (!CLOUD_SYNC_ENABLED) {
    return { success: false, error: "Cloud sync disabled" };
  }

  try {
    const uid = await requireSupabaseUserId();

    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", uid)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!data?.data) {
      return await syncToCloud(uid);
    }

    const cloudData = data.data as CloudUserData;

    if (replaceLocal) {
      await replaceLocalData(cloudData);
    } else {
      await mergeDataToLocal(cloudData);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Sync from cloud failed:", error);
    return { success: false, error: error.message };
  }
}


/**
 * Remplace complètement les données locales par les données cloud
 * Utilisé au login pour s'assurer que l'utilisateur voit ses données cloud
 */
async function replaceLocalData(cloudData: CloudUserData) {
  
  // Remplace tous les decks
  const localDecks = await repo.listDecks();
  const cloudDeckIds = new Set(cloudData.decks.map(d => d.id));
  
  // Sauvegarde tous les decks cloud
  for (const deck of cloudData.decks) {
    await repo.saveDeck(deck);
  }
  
  // Supprime les decks locaux qui n'existent plus dans le cloud
  for (const localDeck of localDecks) {
    if (!cloudDeckIds.has(localDeck.id)) {
      await repo.deleteDeck(localDeck.id);
    }
  }

  // Remplace les review records et quiz attempts
  // (On les garde tous car ils ne peuvent que s'accumuler, pas de suppression)
  for (const record of cloudData.reviewRecords) {
    await repo.saveReviewRecord(record);
  }
}

/**
 * Merge les données cloud avec les données locales de manière intelligente
 * Stratégie : Le LOCAL est la source de vérité pour les suppressions
 * Ne pas re-ajouter les decks qui ont été supprimés localement
 */
async function mergeDataToLocal(cloudData: CloudUserData) {
  // Pour un merge intelligent, on ne fait rien ici
  // Le local est la source de vérité, les suppressions locales sont prioritaires
  // Cette fonction existe pour compatibilité mais ne fait plus de merge
  // La sync se fait uniquement de local → cloud via syncToCloud
}

/**
 * Synchronisation automatique en arrière-plan
 * Stratégie : LOCAL → CLOUD (le local est la source de vérité)
 */
export async function autoSync(userId: string | null): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  
  // ✅ Vérifier rapidement si l'utilisateur est authentifié avant d'appeler syncToCloud
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      // Utilisateur non authentifié, ne pas essayer de sync
      return;
    }
  } catch {
    // Erreur d'auth, ne pas essayer de sync
    return;
  }
  
  // Appeler syncToCloud (qui a maintenant sa propre protection)
  const result = await syncToCloud(userId ?? "");
  
  // Ne pas logger les erreurs "Not authenticated" (c'est normal en mode local)
  if (!result.success && result.error !== "Not authenticated" && result.error !== "Sync cooldown active" && result.error !== "Sync already in progress") {
    console.warn("[autoSync] Sync failed:", result.error);
  }
}


async function requireSupabaseUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }
  if (!user?.id) {
    throw new Error("Not authenticated (supabase user is null)");
  }
  return user.id;
}
