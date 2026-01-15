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
export async function syncToCloud(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!CLOUD_SYNC_ENABLED) {
    return { success: false, error: "Cloud sync disabled" };
  }

  try {
    // Récupère toutes les données locales
    const decks = await repo.listDecks();
    const reviewRecords = await repo.getAllReviewRecords();
    const quizAttempts = await repo.getAllQuizAttempts();
    const freeImportsUsed = await repo.getFreeImportsUsed();
    const creditsBalance = await repo.getCreditsBalance();
    const isSubscribed = await repo.getSubscribed();
    const level = await repo.getLevel();

    const cloudData: CloudUserData = {
      userId,
      decks,
      reviewRecords,
      quizAttempts,
      freeImportsUsed,
      creditsBalance,
      isSubscribed,
      level,
      lastSyncAt: Date.now(),
    };

    // Upsert dans Supabase avec la bonne stratégie
    const { error } = await supabase
      .from("user_data")
      .upsert({ 
        user_id: userId, 
        data: cloudData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id', // Spécifie explicitement la colonne de conflit
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Sync to cloud failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Download les données du cloud et remplace les données locales
 * ⚠️ ATTENTION : Cette fonction remplace complètement les données locales
 * À utiliser uniquement au login ou pour forcer un refresh depuis le cloud
 */
export async function syncFromCloud(userId: string, replaceLocal: boolean = false): Promise<{ success: boolean; error?: string }> {
  if (!CLOUD_SYNC_ENABLED) {
    return { success: false, error: "Cloud sync disabled" };
  }

  try {
    // Récupère les données cloud
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = pas de données trouvées
    
    if (!data || !data.data) {
      // Première connexion : upload les données locales
      return await syncToCloud(userId);
    }

    const cloudData = data.data as CloudUserData;

    if (replaceLocal) {
      // Mode "replace" : remplace complètement les données locales (utilisé au login)
      await replaceLocalData(cloudData);
    } else {
      // Mode "merge" : merge intelligent (utilisé pour auto-sync)
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
  if (!userId || !CLOUD_SYNC_ENABLED) return;

  // Sync unidirectionnelle : upload les changements locaux vers le cloud
  // Le local est la source de vérité quand l'utilisateur est actif
  await syncToCloud(userId);
}

