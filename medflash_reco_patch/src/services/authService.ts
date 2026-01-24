import type { User } from "@supabase/supabase-js";
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

// --- Helper pour transformer l'objet User de Supabase ---
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

// --- Fonctions API ---

export async function signup(data: SignupData): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: signupData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
      },
    });

    if (error) return { user: null, error: error.message };

    return { 
      user: signupData.user ? mapUser(signupData.user) : null, 
      error: null 
    };
  } catch (err) {
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

    return { 
      user: loginData.user ? mapUser(loginData.user) : null, 
      error: null 
    };
  } catch (err) {
    return { user: null, error: "Une erreur inattendue" };
  }
}

export async function logout(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

/**
 * Version corrigée de getCurrentUser
 */
export async function getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    // IMPORTANT:
    // Sur mobile, supabase.auth.getUser() renvoie souvent AuthSessionMissingError
    // quand l'utilisateur n'est pas connecté. Ce n'est pas une "erreur" :
    // on doit simplement considérer que user=null.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return { user: null, error: null };
    }

    // Si on a une session, on valide le JWT côté serveur.
    // IMPORTANT: sur mobile, getUser() sans token peut lever AuthSessionMissingError.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(session.access_token);
    if (error || !user) {
      // AuthSessionMissingError ici => on traite comme "pas connecté"
      if ((error as any)?.name === "AuthSessionMissingError") {
        return { user: null, error: null };
      }
      return { user: null, error: error?.message ?? null };
    }

    return { user: mapUser(user), error: null };
  } catch (err) {
    return { user: null, error: "Impossible de récupérer l'utilisateur" };
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function changePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}

export async function deleteAccount(): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) return { error: "Utilisateur non connecté" };

    // 1. Supprimer les données métier
    const { error: dbError } = await supabase
      .from("user_data")
      .delete()
      .eq("user_id", userId);

    if (dbError) throw dbError;

    // Note: La suppression réelle du compte Auth nécessite une fonction admin.
    // On se contente de déconnecter ici.
    await logout();
    return { error: null };
  } catch (err: any) {
    return { error: err.message || "Erreur lors de la suppression" };
  }
}