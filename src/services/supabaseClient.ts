/**
 * Client Supabase
 * 
 * Ce fichier initialise le client Supabase avec un stockage sécurisé des tokens.
 * Les tokens d'authentification sont stockés de manière chiffrée sur l'appareil.
 * 
 * FONCTIONNEMENT :
 * - Utilise expo-secure-store pour stocker les tokens de manière sécurisée
 * - Le client Supabase utilise ce storage pour persister la session
 * - Quand l'utilisateur ferme et rouvre l'app, la session est automatiquement restaurée
 */

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config/supabase";

// Storage sécurisé pour les tokens d'authentification
// Sur iOS/Android : utilise le Keychain/Keystore natif
// Sur Web : fallback sur localStorage
const secureStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// Client Supabase singleton
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Pas besoin pour mobile
  },
});

