import type { User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { supabase } from "./supabaseClient";

// --- Types ---
export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
};

export type SignupData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export type LoginData = {
  email: string;
  password: string;
};

// --- Helper ---
function mapUser(user: User): AuthUser {
  const md = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    createdAt: user.created_at,
    firstName: (md.firstName ?? md.first_name ?? md.given_name ?? null) as string | null,
    lastName: (md.lastName ?? md.last_name ?? md.family_name ?? null) as string | null,
  };
}

// --- Auth basique ---
export async function signup(data: SignupData): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: signupData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { firstName: data.firstName, lastName: data.lastName },
      },
    });

    if (error) return { user: null, error: error.message };
    return { user: signupData.user ? mapUser(signupData.user) : null, error: null };
  } catch {
    return { user: null, error: "Une erreur inattendue s'est produite" };
  }
}

export async function login(data: LoginData): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) return { user: null, error: error.message };
    return { user: loginData.user ? mapUser(loginData.user) : null, error: null };
  } catch {
    return { user: null, error: "Une erreur inattendue" };
  }
}

export async function logout(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

export async function getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { user: null, error: error?.message ?? null };
    return { user: mapUser(user), error: null };
  } catch {
    return { user: null, error: "Impossible de récupérer l'utilisateur" };
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// -----------------------------------------------------------------------------
// RESET PASSWORD (Mot de passe oublié)
// -----------------------------------------------------------------------------

/**
 * C’est CE lien qui doit être autorisé dans Supabase -> Auth -> URL Configuration -> Redirect URLs
 * - Expo Go: exp://.../--/auth/reset
 * - Dev build/prod: medflash://auth/reset
 */
export function getResetRedirectTo(): string {
  // Important: route expo-router => app/auth/reset.tsx
  return Linking.createURL("auth/reset");
}

/**
 * 1) Envoie l’email de reset.
 */
export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  try {
    const redirectTo = getResetRedirectTo();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error?.message ?? null };
  } catch (e: any) {
    return { error: e?.message ?? "Impossible d'envoyer l'email de réinitialisation." };
  }
}

/**
 * Parse query + hash (pour supporter ?code=... et #access_token=...)
 */
function parseUrlParams(url: string): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    const qIndex = url.indexOf("?");
    const hIndex = url.indexOf("#");
    const query = qIndex >= 0 ? url.slice(qIndex + 1, hIndex >= 0 ? hIndex : undefined) : "";
    const hash = hIndex >= 0 ? url.slice(hIndex + 1) : "";

    const add = (s: string) => {
      if (!s) return;
      for (const part of s.split("&")) {
        if (!part) continue;
        const [k, v = ""] = part.split("=");
        if (!k) continue;
        out[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    };

    add(query);
    add(hash);
    return out;
  } catch {
    return {};
  }
}

/**
 * 2) Quand l’utilisateur clique le lien, l’app reçoit un deep link.
 * On initialise la session recovery (indispensable avant updateUser(password)).
 */
export async function setRecoverySessionFromUrl(url: string): Promise<{ error: string | null }> {
  try {
    if (!url) return { error: "URL manquante" };

    const p = parseUrlParams(url);

    // PKCE code flow (le plus courant)
    if (p.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      return { error: error?.message ?? null };
    }

    // Implicit tokens (plus rare)
    if (p.access_token && p.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: p.access_token,
        refresh_token: p.refresh_token,
      });
      return { error: error?.message ?? null };
    }

    return { error: "Lien invalide (tokens/code manquants). Vérifie les Redirect URLs dans Supabase." };
  } catch (e: any) {
    return { error: e?.message ?? "Impossible d'initialiser la session de récupération." };
  }
}

/**
 * 3) Une fois la session recovery prête, on peut changer le mot de passe.
 */
export async function updatePasswordFromRecovery(newPassword: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  } catch (e: any) {
    return { error: e?.message ?? "Impossible de modifier le mot de passe." };
  }
}

// (optionnel) si tu veux garder cette API existante :
export async function changePassword(newPassword: string): Promise<{ error: string | null }> {
  return updatePasswordFromRecovery(newPassword);
}

// --- deleteAccount (inchangé) ---
export async function deleteAccount(): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) return { error: "Utilisateur non connecté" };

    const { error: dbError } = await supabase.from("user_data").delete().eq("user_id", userId);
    if (dbError) throw dbError;

    await logout();
    return { error: null };
  } catch (err: any) {
    return { error: err.message || "Erreur lors de la suppression" };
  }
}
