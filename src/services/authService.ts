/**
 * Service d'Authentification
 * 
 * Ce service gère toutes les opérations d'authentification utilisateur.
 * 
 * FONCTIONNEMENT :
 * - signup() : Crée un nouveau compte utilisateur avec email/password
 * - login() : Connecte un utilisateur existant
 * - logout() : Déconnecte l'utilisateur et supprime la session
 * - getCurrentUser() : Récupère l'utilisateur actuellement connecté
 * - resetPassword() : Envoie un email de réinitialisation de mot de passe
 * 
 * IMPACT :
 * - Les données utilisateur sont stockées sur Supabase (cloud)
 * - La session est persistée localement de manière sécurisée
 * - L'app peut détecter si l'utilisateur est connecté au démarrage
 */

import { supabase } from "./supabaseClient";

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type SignupData = {
  email: string;
  password: string;
};

export type LoginData = {
  email: string;
  password: string;
};

/**
 * Crée un nouveau compte utilisateur
 */
export async function signup(data: SignupData): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;

    if (!authData.user) {
      return { user: null, error: "Impossible de créer le compte" };
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        createdAt: authData.user.created_at,
      },
      error: null,
    };
  } catch (error: any) {
    return { user: null, error: error.message || "Erreur lors de l'inscription" };
  }
}

/**
 * Connecte un utilisateur existant
 */
export async function login(data: LoginData): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;

    if (!authData.user) {
      return { user: null, error: "Identifiants incorrects" };
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        createdAt: authData.user.created_at,
      },
      error: null,
    };
  } catch (error: any) {
    return { user: null, error: error.message || "Erreur lors de la connexion" };
  }
}

/**
 * Déconnecte l'utilisateur
 */
export async function logout(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message || "Erreur lors de la déconnexion" };
  }
}

/**
 * Récupère l'utilisateur actuellement connecté
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    return {
      id: user.id,
      email: user.email!,
      createdAt: user.created_at,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Envoie un email de réinitialisation de mot de passe
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message || "Erreur lors de la réinitialisation" };
  }
}

/**
 * Écoute les changements d'état d'authentification
 * Retourne une fonction de cleanup
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user
      ? {
          id: session.user.id,
          email: session.user.email!,
          createdAt: session.user.created_at,
        }
      : null;
    
    callback(user);
  });

  return () => subscription.unsubscribe();
}

