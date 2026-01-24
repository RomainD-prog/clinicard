import { create } from "zustand";
import { FREE_IMPORTS_LIMIT } from "../config/env";
import type { AuthUser } from "../services/authService";
import * as authService from "../services/authService";
import * as cloudSync from "../services/cloudSync";
import * as repo from "../storage/repo";
import { Deck, PickedFile, StudyLevel } from "../types/models";

export type ThemeMode = "system" | "light" | "dark";

type AppState = {
  isReady: boolean;
  userId: string | null;
  authUser: AuthUser | null; // ✅ Utilisateur authentifié (cloud)
  level: StudyLevel;

  // ✅ NEW
  themeMode: ThemeMode;

  darkMode: boolean;


  freeImportsUsed: number;
  creditsBalance: number;
  isSubscribed: boolean;

  reviewStats: { streak: number; doneToday: number };
  reminder: { enabled: boolean; hour: number; minute: number; notifId: string | null };

  decks: Deck[];
  selectedFile: PickedFile | null;
  selectedExamFile: PickedFile | null;
  onboardingDone: boolean;

  bootstrap: () => Promise<void>;
  setLevel: (lvl: StudyLevel) => Promise<void>;
  setSelectedFile: (f: PickedFile | null) => void;
  setSelectedExamFile: (f: PickedFile | null) => void;

  refreshDecks: () => Promise<void>;
  incFreeImportUsed: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setDarkMode: (v: boolean) => Promise<void>;
  addCredits: (amount: number) => Promise<void>;
  spendCredits: (amount: number) => Promise<void>;
  setSubscribed: (v: boolean) => Promise<void>;

  resetAll: () => Promise<void>;
  refreshReviewStats: () => Promise<void>;

  freeImportsRemaining: () => number;
  setReminderLocal: (
    patch: Partial<{ enabled: boolean; hour: number; minute: number; notifId: string | null }>
  ) => void;
  refreshReminder: () => Promise<void>;
  setOnboardingDone: (v: boolean) => Promise<void>;

  // ✅ Auth & Sync
  setAuthUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  syncUserData: (cloudUserId: string) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  isReady: false,
  userId: null,
  authUser: null, // ✅ Initialement null
  level: "PASS",

  darkMode: false,
  themeMode: "system",

  reviewStats: { streak: 0, doneToday: 0 },
  freeImportsUsed: 0,
  creditsBalance: 0,
  isSubscribed: false,

  decks: [],
  selectedFile: null,
  selectedExamFile: null,
  reminder: { enabled: false, hour: 19, minute: 0, notifId: null },
  onboardingDone: false,

  bootstrap: async () => {
    const userId = await repo.getOrCreateUserId();
    const level = await repo.getLevel();
    const freeImportsUsed = await repo.getFreeImportsUsed();
    const decks = await repo.listDecks();
    const creditsBalance = await repo.getCreditsBalance();
    const isSubscribed = await repo.getSubscribed();
    const stats = await repo.getReviewStats();
    const reminder = await repo.getReminderSettings();
    const onboardingDone = await repo.getOnboardingDone();
    const darkMode = await repo.getDarkMode();


    // ✅ NEW
    const themeMode = await repo.getThemeMode();

    set({
      userId,
      level,
      themeMode,
      freeImportsUsed,
      decks,
      creditsBalance,
      isSubscribed,
      isReady: true,
      reviewStats: { streak: stats.streak, doneToday: stats.doneToday },
      reminder,
      onboardingDone,
      darkMode,
    });

    // ✅ Vérifie le statut d'authentification
    await get().checkAuthStatus();
  },

  setLevel: async (lvl) => {
    await repo.setLevel(lvl);
    set({ level: lvl });
  },

  // ✅ NEW
  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    await repo.setThemeMode(mode);
  },

  setDarkMode: async (v) => {
    set({ darkMode: v });
    await repo.setDarkMode(v);
  },

  setSelectedFile: (f) => set({ selectedFile: f }),

  setSelectedExamFile: (f) => set({ selectedExamFile: f }),

  refreshDecks: async () => {
    const decks = await repo.listDecks();
    set({ decks });
  },

  incFreeImportUsed: async () => {
    const next = await repo.incFreeImportsUsed();
    set({ freeImportsUsed: next });
  },

  addCredits: async (amount) => {
    const next = await repo.addCredits(amount);
    set({ creditsBalance: next });
  },

  spendCredits: async (amount) => {
    const next = await repo.spendCredits(amount);
    set({ creditsBalance: next });
  },

  setSubscribed: async (v) => {
    await repo.setSubscribed(v);
    set({ isSubscribed: v });
  },

  refreshReviewStats: async () => {
    const stats = await repo.getReviewStats();
    set({ reviewStats: { streak: stats.streak, doneToday: stats.doneToday } });
  },

  resetAll: async () => {
    await repo.resetAll();
    const decks = await repo.listDecks();
    const freeImportsUsed = await repo.getFreeImportsUsed();
    const creditsBalance = await repo.getCreditsBalance();
    const isSubscribed = await repo.getSubscribed();

    set({ decks, freeImportsUsed, creditsBalance, isSubscribed });
  },

  setReminderLocal: (patch) => {
    set({ reminder: { ...get().reminder, ...patch } });
  },

  refreshReminder: async () => {
    const reminder = await repo.getReminderSettings();
    set({ reminder });
  },

  setOnboardingDone: async (v) => {
    await repo.setOnboardingDone(v);
    set({ onboardingDone: v });
  },

  freeImportsRemaining: () => Math.max(0, FREE_IMPORTS_LIMIT - get().freeImportsUsed),

  // ✅ Auth & Sync
  // Quand on définit un utilisateur authentifié, on aligne aussi userId
  // (il sert d'identifiant global dans l'app : RevenueCat, cloud sync, etc.).
  setAuthUser: (user) =>
    set((s) => ({
      authUser: user,
      userId: user ? user.id : s.userId,
    })),

  logout: async () => {
    const currentUser = get().authUser;
    if (currentUser) {
      // ✅ Effacer les données de l'utilisateur actuel
      await repo.clearUserData(currentUser.id);
      // ✅ Réinitialiser l'ID utilisateur authentifié
      await repo.setCurrentAuthUserId(null);
    }
    
    await authService.logout();
    
    // ✅ Réinitialiser l'état de l'application
    set({ 
      authUser: null,
      decks: [],
      reviewStats: { streak: 0, doneToday: 0 },
      freeImportsUsed: 0,
      creditsBalance: 0,
      isSubscribed: false,
    });
    
    // ✅ Charger un nouvel userId local pour la session non authentifiée
    const newLocalUserId = await repo.getCurrentUserId();
    set({ userId: newLocalUserId });
  },

  syncUserData: async (cloudUserId: string) => {
    // Synchronise les données depuis le cloud (utilisé au login/signup)
    // replaceLocal=true pour remplacer les données locales par celles du cloud
    await cloudSync.syncFromCloud(cloudUserId, true);
    // Rafraîchit l'état local après sync
    await get().refreshDecks();
    await get().refreshReviewStats();
  },

  checkAuthStatus: async () => {
    // Vérifie si un utilisateur est déjà connecté au démarrage
    const { user, error } = await authService.getCurrentUser();

    if (error) {
      console.warn("[Store] getCurrentUser failed:", error);
      return;
    }

    if (!user) return;

    // ✅ Définir l'utilisateur authentifié comme utilisateur actuel
    await repo.setCurrentAuthUserId(user.id);
    set({ authUser: user, userId: user.id });

    // ✅ Charger les données de cet utilisateur depuis le cloud
    await cloudSync.syncFromCloud(user.id, true);
    await get().refreshDecks();
    await get().refreshReviewStats();
  },

  refreshSubscriptionStatus: async () => {
    try {
      // Importer dynamiquement pour éviter les problèmes de dépendances circulaires
      const { hasActiveSubscription } = await import("../services/purchases");
      const isActive = await hasActiveSubscription();
      await get().setSubscribed(isActive);
      console.log("[Store] 🔄 Statut abonnement mis à jour:", isActive);
    } catch (e) {
      console.error("[Store] ❌ Erreur refresh subscription:", e);
    }
  },
}));
