import { supabase } from "./supabaseClient";

// Type pour les erreurs d'authentification
export type AuthError = {
  message: string;
  status?: number;
};

// Type pour les données utilisateur
export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
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

function mapUser(user: any): AuthUser {
  const md = (user?.user_metadata ?? {}) as Record<string, any>;

  const firstName =
    (md.firstName ?? md.first_name ?? md.given_name ?? null) as string | null;

  const lastName =
    (md.lastName ?? md.last_name ?? md.family_name ?? null) as string | null;

  return {
    id: user.id,
    email: user.email ?? "",
    createdAt: user.created_at ?? "",
    firstName,
    lastName,
  };
}

/**
 * Crée un nouveau compte utilisateur
 */
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

    if (error) {
      console.error("Erreur signup:", error.message);
      return { user: null, error: error.message };
    }

    return { user: signupData.user ? mapUser(signupData.user) : null, error: null };
  } catch (err) {
    console.error("Erreur signup:", err);
    return { user: null, error: "Une erreur inattendue s'est produite" };
  }
}

/**
 * Connexion utilisateur
 */
export async function login(data: LoginData): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      console.error("Erreur login:", error.message);
      return { user: null, error: error.message };
    }

    return { user: loginData.user ? mapUser(loginData.user) : null, error: null };
  } catch (err) {
    console.error("Erreur login:", err);
    return { user: null, error: "Une erreur inattendue s'est produite" };
  }
}

/**
 * Déconnexion utilisateur
 */
export async function logout(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erreur logout:", error.message);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error("Erreur logout:", err);
    return { error: "Une erreur inattendue s'est produite" };
  }
}

/**
 * Récupère l'utilisateur connecté actuellement
 */
export async function getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (!data.user) return { user: null, error: null };

    return { user: mapUser(data.user), error: null };
  } catch (err) {
    console.error("Erreur getCurrentUser:", err);
    return { user: null, error: "Impossible de récupérer l'utilisateur" };
  }
}

/**
 * Vérifie si un utilisateur est connecté
 */
export async function isLoggedIn(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch (err) {
    console.error("Erreur isLoggedIn:", err);
    return false;
  }
}

/**
 * Change le mot de passe de l'utilisateur connecté
 */
export async function changePassword(newPassword: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Erreur changePassword:", error.message);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error("Erreur changePassword:", err);
    return { error: "Une erreur inattendue s'est produite" };
  }
}

/**
 * Supprime le compte utilisateur (et ses données)
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  try {
    // NOTE: suppression user côté serveur via service role / edge function en prod.
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return { error: "Utilisateur non connecté" };

    const { error } = await supabase
      .from("user_data")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Erreur deleteAccount user_data:", error.message);
      return { error: error.message };
    }

    await logout();
    return { error: null };
  } catch (err) {
    console.error("Erreur deleteAccount:", err);
    return { error: "Une erreur inattendue s'est produite" };
  }
}
