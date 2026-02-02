import AsyncStorage from "@react-native-async-storage/async-storage";
import { FREE_IMPORTS_LIMIT } from "../config/env";
import type { ThemeMode } from "../store/useAppStore";
import { Category, Deck, GenerationJob, QuizAttempt, ReviewRecord, StudyLevel } from "../types/models";
import { addDays, localYMD } from "../utils/dates";
import { uid } from "../utils/ids";
import { getJSON, removeKey, setJSON } from "./kv";

// ✅ Import dynamique pour éviter la dépendance circulaire
let cloudSyncModule: any = null;
async function getCloudSync() {
  if (!cloudSyncModule) {
    cloudSyncModule = await import("../services/cloudSync");
  }
  return cloudSyncModule;
}


// ✅ Auto-sync après chaque modification si l'utilisateur est authentifié
// Protection contre les appels répétés
let lastAutoSyncTime = 0;
const AUTO_SYNC_THROTTLE_MS = 2000; // 2 secondes minimum entre les syncs

async function triggerAutoSync() {
  try {
    // ✅ Throttle : éviter les appels trop fréquents
    const now = Date.now();
    if (now - lastAutoSyncTime < AUTO_SYNC_THROTTLE_MS) {
      return; // Trop tôt, ignorer
    }
    lastAutoSyncTime = now;

    const authUserId = await getJSON<string>(GLOBAL_KEYS.authUserId, null);
    if (!isUuid(authUserId)) {
      if (authUserId) await removeKey(GLOBAL_KEYS.authUserId);
      return;
    }
    
    const cloudSync = await getCloudSync();
    // Fire and forget, ne pas logger les erreurs "Not authenticated"
    cloudSync.autoSync(authUserId).catch((err: any) => {
      // Ne logger que les vraies erreurs, pas "Not authenticated"
      if (err?.message && !err.message.includes("Not authenticated")) {
        console.warn("Auto-sync failed:", err.message);
      }
    });
  } catch (err) {
    // Ignorer silencieusement les erreurs de trigger
  }
}


// ✅ Clés globales (non isolées par utilisateur)
const GLOBAL_KEYS = {
  authUserId: "mf:authUserId", // ID de l'utilisateur authentifié actuellement
  themeMode: "theme_mode",
  darkMode: "dark_mode",
  localUserId: "mf:localUserId",

};

// ✅ Clés de données utilisateur (seront préfixées par userId)
const USER_DATA_KEYS = {
  level: "level",
  freeImportsUsed: "freeImportsUsed",
  decks: "decks",
  categories: "categories",
  jobs: "jobs",
  reviews: "reviews",
  creditsBalance: "creditsBalance",
  isSubscribed: "isSubscribed",
  reviewStats: "reviewStats",
  quizAttempts: "quizAttempts",
  reminderEnabled: "reminderEnabled",
  reminderHour: "reminderHour",
  reminderMinute: "reminderMinute",
  reminderNotifId: "reminderNotifId",
  onboardingDone: "onboardingDone",
};

// ✅ Obtenir l'ID utilisateur actuel (authUserId si connecté, sinon génère un userId local)
let currentUserId: string | null = null;

function isUuid(v: unknown): v is string {
  if (typeof v !== "string") return false;
  if (v === "undefined" || v === "null") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}


export async function getCurrentUserId() {
  if (currentUserId) return currentUserId;

  const authUserId = await getJSON<string>(GLOBAL_KEYS.authUserId, null);
  if (isUuid(authUserId)) {
    currentUserId = authUserId;
    return authUserId;
  }
  if (authUserId) {
    await removeKey(GLOBAL_KEYS.authUserId); // nettoie "undefined"
  }

  const localUserId = await getJSON<string>(GLOBAL_KEYS.localUserId, null);
  if (localUserId) {
    currentUserId = localUserId;
    return localUserId;
  }

  const newId = uid("u_local_");
  await setJSON(GLOBAL_KEYS.localUserId, newId);
  currentUserId = newId;
  return newId;
}


// ✅ Définir l'utilisateur authentifié actuel
export async function setCurrentAuthUserId(userId: string | null): Promise<void> {
  if (isUuid(userId)) {
    await setJSON(GLOBAL_KEYS.authUserId, userId);
    currentUserId = userId;
  } else {
    await removeKey(GLOBAL_KEYS.authUserId);
    currentUserId = null;
  }
}


// ✅ Obtenir la clé préfixée pour l'utilisateur actuel
async function getUserKey(key: string): Promise<string> {
  const userId = await getCurrentUserId();
  return `mf:user:${userId}:${key}`;
}

// ✅ Effacer toutes les données d'un utilisateur spécifique
export async function clearUserData(userId: string): Promise<void> {
  const keys = Object.values(USER_DATA_KEYS);
  await Promise.all(
    keys.map((key) => removeKey(`mf:user:${userId}:${key}`))
  );
}

export async function getThemeMode(): Promise<ThemeMode> {
  const v = await AsyncStorage.getItem(GLOBAL_KEYS.themeMode);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export async function setThemeMode(mode: ThemeMode) {
  await AsyncStorage.setItem(GLOBAL_KEYS.themeMode, mode);
}

export async function getDarkMode(): Promise<boolean> {
  const v = await AsyncStorage.getItem(GLOBAL_KEYS.darkMode);
  return v === "1";
}

export async function setDarkMode(v: boolean) {
  await AsyncStorage.setItem(GLOBAL_KEYS.darkMode, v ? "1" : "0");
}
export async function updateDeckCard(
  deckId: string,
  cardId: string,
  patch: { question?: string; answer?: string; sourcePage?: number; sourceSnippet?: string }
) {
  const deck = await getDeck(deckId);
  if (!deck) throw new Error("Deck introuvable");

  const idx = deck.cards.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error("Carte introuvable");

  deck.cards[idx] = {
    ...deck.cards[idx],
    ...patch,
    id: cardId, // ✅ sécurité : on garde le même id
  };

  await saveDeck(deck); // ✅ écrase le deck dans la DB (saveDeck fait déjà l'auto-sync)
  return deck.cards[idx];
}

export async function addDeckCard(
  deckId: string,
  card: { question: string; answer: string; sourcePage?: number; sourceSnippet?: string }
) {
  const deck = await getDeck(deckId);
  if (!deck) throw new Error("Deck introuvable");

  const newCard = { id: uid("card_"), ...card };
  deck.cards = [newCard, ...deck.cards];

  await saveDeck(deck); // ✅ persist (saveDeck fait déjà l'auto-sync)
  return newCard;
}

// ✅ Ancienne fonction pour la compatibilité (deprecated, utiliser getCurrentUserId)
export async function getOrCreateUserId(): Promise<string> {
  return getCurrentUserId();
}

export async function getLevel(): Promise<StudyLevel> {
  const key = await getUserKey(USER_DATA_KEYS.level);
  return (await getJSON<StudyLevel>(key)) ?? "PASS";
}

export async function setLevel(level: StudyLevel): Promise<void> {
  const key = await getUserKey(USER_DATA_KEYS.level);
  await setJSON(key, level);
}

export async function getFreeImportsUsed(): Promise<number> {
  const key = await getUserKey(USER_DATA_KEYS.freeImportsUsed);
  return (await getJSON<number>(key)) ?? 0;
}

export async function incFreeImportsUsed(): Promise<number> {
  const used = await getFreeImportsUsed();
  const next = used + 1;
  const key = await getUserKey(USER_DATA_KEYS.freeImportsUsed);
  await setJSON(key, next);
  return next;
}

export async function getFreeImportsRemaining(): Promise<number> {
  const used = await getFreeImportsUsed();
  return Math.max(0, FREE_IMPORTS_LIMIT - used);
}

export async function listDecks(): Promise<Deck[]> {
  const key = await getUserKey(USER_DATA_KEYS.decks);
  return (await getJSON<Deck[]>(key)) ?? [];
}

// ---------------------------
// Categories / Folders
// ---------------------------

export async function listCategories(): Promise<Category[]> {
  const key = await getUserKey(USER_DATA_KEYS.categories);
  const cats = (await getJSON<Category[]>(key)) ?? [];
  return [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function setCategories(categories: Category[]): Promise<void> {
  const key = await getUserKey(USER_DATA_KEYS.categories);
  await setJSON(key, categories);
  await triggerAutoSync();
}

export async function createCategory(name: string): Promise<Category> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new Error("Nom invalide");

  const cats = await listCategories();
  const maxOrder = cats.reduce((m, c) => Math.max(m, Number(c.order ?? 0)), 0);
  const cat: Category = {
    id: uid("cat_"),
    name: trimmed,
    order: maxOrder + 1,
    createdAt: Date.now(),
  };
  await setCategories([...cats, cat]);
  return cat;
}

export async function renameCategory(categoryId: string, name: string): Promise<void> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new Error("Nom invalide");
  const cats = await listCategories();
  const next = cats.map((c) => (c.id === categoryId ? { ...c, name: trimmed } : c));
  await setCategories(next);
}

export async function deleteCategory(categoryId: string, opts?: { moveDecksToNull?: boolean }): Promise<void> {
  const moveDecksToNull = opts?.moveDecksToNull ?? true;

  const cats = await listCategories();
  await setCategories(cats.filter((c) => c.id !== categoryId));

  if (moveDecksToNull) {
    const decks = await listDecks();
    const touched = decks.map((d) => (d.categoryId === categoryId ? { ...d, categoryId: null } : d));
    const key = await getUserKey(USER_DATA_KEYS.decks);
    await setJSON(key, touched);
    await triggerAutoSync();
  }
}

export async function setDeckCategory(deckId: string, categoryId: string | null): Promise<void> {
  const decks = await listDecks();
  const idx = decks.findIndex((d) => d.id === deckId);
  if (idx === -1) throw new Error("Deck introuvable");
  decks[idx] = { ...decks[idx], categoryId: categoryId ?? null };
  const key = await getUserKey(USER_DATA_KEYS.decks);
  await setJSON(key, decks);
  await triggerAutoSync();
}

export async function saveDeck(deck: Deck): Promise<void> {
  const decks = await listDecks();
  const idx = decks.findIndex((d) => d.id === deck.id);
  if (idx >= 0) decks[idx] = deck;
  else decks.unshift(deck);
  const key = await getUserKey(USER_DATA_KEYS.decks);
  await setJSON(key, decks);
  
  // ✅ Auto-sync après modification
  await triggerAutoSync();
}

export async function getDeck(deckId: string): Promise<Deck | null> {
  const decks = await listDecks();
  return decks.find((d) => d.id === deckId) ?? null;
}

export async function saveJob(job: GenerationJob): Promise<void> {
  const key = await getUserKey(USER_DATA_KEYS.jobs);
  const jobs = (await getJSON<Record<string, GenerationJob>>(key)) ?? {};
  jobs[job.jobId] = job;
  await setJSON(key, jobs);
}

export async function getJob(jobId: string): Promise<GenerationJob | null> {
  const key = await getUserKey(USER_DATA_KEYS.jobs);
  const jobs = (await getJSON<Record<string, GenerationJob>>(key)) ?? {};
  return jobs[jobId] ?? null;
}

export async function listReviews(): Promise<ReviewRecord[]> {
  const key = await getUserKey(USER_DATA_KEYS.reviews);
  return (await getJSON<ReviewRecord[]>(key)) ?? [];
}

export async function upsertReview(rec: ReviewRecord): Promise<void> {
  const all = await listReviews();
  const idx = all.findIndex((r) => r.cardId === rec.cardId && r.deckId === rec.deckId);
  if (idx >= 0) all[idx] = rec;
  else all.push(rec);
  const key = await getUserKey(USER_DATA_KEYS.reviews);
  await setJSON(key, all);
  
  // ✅ Auto-sync après modification
  await triggerAutoSync();
}

export async function getReview(deckId: string, cardId: string): Promise<ReviewRecord | null> {
  const all = await listReviews();
  return all.find((r) => r.deckId === deckId && r.cardId === cardId) ?? null;
}

export async function dueCardsForDeck(deck: Deck, now = Date.now()): Promise<string[]> {
  const all = await listReviews();
  const due = new Set<string>();
  for (const card of deck.cards) {
    const rec = all.find((r) => r.deckId === deck.id && r.cardId === card.id);
    if (!rec) due.add(card.id);
    else if (rec.dueAt <= now) due.add(card.id);
  }
  return [...due];
}

export async function resetAll(): Promise<void> {
  const userId = await getCurrentUserId();
  await clearUserData(userId);
}

export async function getCreditsBalance(): Promise<number> {
  const key = await getUserKey(USER_DATA_KEYS.creditsBalance);
  return (await getJSON<number>(key)) ?? 0;
}

export async function addCredits(amount: number): Promise<number> {
  const cur = await getCreditsBalance();
  const next = Math.max(0, cur + amount);
  const key = await getUserKey(USER_DATA_KEYS.creditsBalance);
  await setJSON(key, next);
  return next;
}

export async function spendCredits(amount: number): Promise<number> {
  const cur = await getCreditsBalance();
  const next = Math.max(0, cur - amount);
  const key = await getUserKey(USER_DATA_KEYS.creditsBalance);
  await setJSON(key, next);
  return next;
}

export async function getSubscribed(): Promise<boolean> {
  const key = await getUserKey(USER_DATA_KEYS.isSubscribed);
  return (await getJSON<boolean>(key)) ?? false;
}

export async function setSubscribed(v: boolean): Promise<void> {
  const key = await getUserKey(USER_DATA_KEYS.isSubscribed);
  await setJSON(key, v);
}

export async function deleteDeck(deckId: string): Promise<void> {
  const decks = await listDecks();
  const decksKey = await getUserKey(USER_DATA_KEYS.decks);
  await setJSON(decksKey, decks.filter((d) => d.id !== deckId));

  const reviews = await listReviews();
  const reviewsKey = await getUserKey(USER_DATA_KEYS.reviews);
  await setJSON(reviewsKey, reviews.filter((r) => r.deckId !== deckId));
  
  // ✅ Auto-sync après suppression
  await triggerAutoSync();
}


export type ReviewStats = {
  streak: number;
  lastActiveDay: string | null; // YYYY-MM-DD
  doneToday: number;
  doneDay: string | null;       // YYYY-MM-DD (jour associé à doneToday)
};

const DEFAULT_STATS: ReviewStats = {
  streak: 0,
  lastActiveDay: null,
  doneToday: 0,
  doneDay: null,
};

export async function getReviewStats(): Promise<ReviewStats> {
  const key = await getUserKey(USER_DATA_KEYS.reviewStats);
  return (await getJSON<ReviewStats>(key)) ?? DEFAULT_STATS;
}

export async function recordReviewDone(now: Date = new Date()): Promise<ReviewStats> {
  const today = localYMD(now);
  const yesterday = localYMD(addDays(now, -1));

  const cur = await getReviewStats();

  // doneToday: reset si on change de jour
  let doneToday = cur.doneToday;
  let doneDay = cur.doneDay;
  if (doneDay !== today) {
    doneToday = 0;
    doneDay = today;
  }
  doneToday += 1;

  // streak
  let streak = cur.streak;
  if (!cur.lastActiveDay) {
    streak = 1;
  } else if (cur.lastActiveDay === today) {
    // streak inchangé
  } else if (cur.lastActiveDay === yesterday) {
    streak = streak + 1;
  } else {
    streak = 1;
  }

  const next: ReviewStats = {
    streak,
    lastActiveDay: today,
    doneToday,
    doneDay,
  };

  const key = await getUserKey(USER_DATA_KEYS.reviewStats);
  await setJSON(key, next);
  return next;
}

export async function listQuizAttempts(deckId: string): Promise<QuizAttempt[]> {
  const key = await getUserKey(USER_DATA_KEYS.quizAttempts);
  const all = (await getJSON<QuizAttempt[]>(key)) ?? [];
  return all
    .filter((a) => a.deckId === deckId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAllQuizAttempts(): Promise<QuizAttempt[]> {
  const key = await getUserKey(USER_DATA_KEYS.quizAttempts);
  return (await getJSON<QuizAttempt[]>(key)) ?? [];
}

export async function addQuizAttempt(deckId: string, total: number, correct: number): Promise<QuizAttempt> {
  const key = await getUserKey(USER_DATA_KEYS.quizAttempts);
  const all = (await getJSON<QuizAttempt[]>(key)) ?? [];
  const attempt: QuizAttempt = {
    id: uid("qa_"),
    deckId,
    createdAt: Date.now(),
    total,
    correct,
  };
  all.unshift(attempt);
  await setJSON(key, all);
  
  // ✅ Auto-sync après ajout
  await triggerAutoSync();
  
  return attempt;
}

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
  notifId: string | null;
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  const enabledKey = await getUserKey(USER_DATA_KEYS.reminderEnabled);
  const hourKey = await getUserKey(USER_DATA_KEYS.reminderHour);
  const minuteKey = await getUserKey(USER_DATA_KEYS.reminderMinute);
  const notifIdKey = await getUserKey(USER_DATA_KEYS.reminderNotifId);

  const enabled = (await getJSON<boolean>(enabledKey)) ?? false;
  const hour = (await getJSON<number>(hourKey)) ?? 19;
  const minute = (await getJSON<number>(minuteKey)) ?? 0;
  const notifId = (await getJSON<string>(notifIdKey)) ?? null;

  return { enabled, hour, minute, notifId };
}

export async function setReminderSettings(s: ReminderSettings): Promise<void> {
  const enabledKey = await getUserKey(USER_DATA_KEYS.reminderEnabled);
  const hourKey = await getUserKey(USER_DATA_KEYS.reminderHour);
  const minuteKey = await getUserKey(USER_DATA_KEYS.reminderMinute);
  const notifIdKey = await getUserKey(USER_DATA_KEYS.reminderNotifId);

  await setJSON(enabledKey, s.enabled);
  await setJSON(hourKey, s.hour);
  await setJSON(minuteKey, s.minute);
  await setJSON(notifIdKey, s.notifId);
}

export async function getOnboardingDone(): Promise<boolean> {
  const key = await getUserKey(USER_DATA_KEYS.onboardingDone);
  return (await getJSON<boolean>(key)) ?? false;
}

export async function setOnboardingDone(v: boolean): Promise<void> {
  const key = await getUserKey(USER_DATA_KEYS.onboardingDone);
  await setJSON(key, v);
}

// Aliases pour la synchronisation cloud
export const getAllReviewRecords = listReviews;
export const getAllQuizAttempts = listAllQuizAttempts;
export const getReviewRecord = getReview;
export const saveReviewRecord = upsertReview;
