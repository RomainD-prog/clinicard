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

export async function signup(
  data: SignupData
): Promise<{ user: AuthUser | null; error: string | null }> {
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
      error: null,
    };
  } catch {
    return { user: null, error: "Une erreur inattendue s'est produite" };
  }
}

export async function login(
  data: LoginData
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) return { user: null, error: error.message };

    return {
      user: loginData.user ? mapUser(loginData.user) : null,
      error: null,
    };
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { user: null, error: null };
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      if ((error as any)?.name === "AuthSessionMissingError") {
        return { user: null, error: null };
      }
      return { user: null, error: error?.message ?? null };
    }

    return { user: mapUser(user), error: null };
  } catch {
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

/**
 * Demande d'envoi d'un email de réinitialisation du mot de passe.
 * Le lien doit rediriger vers un deep link géré par l'app (écran /auth/reset).
 */
export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "medflash://auth/reset",
    });
    return { error: error?.message ?? null };
  } catch (err: any) {
    return { error: err?.message ?? "Erreur lors de l'envoi de l'email" };
  }
}

/**
 * Valide un lien de recovery Supabase et pose une session.
 *
 * IMPORTANT: ton client Supabase est en flowType "pkce".
 * -> Supabase peut renvoyer un `code=...` (query) au lieu de access_token/refresh_token (hash).
 * On doit donc supporter:
 *  - error / error_description / error_code
 *  - code  -> exchangeCodeForSession(code)
 *  - access_token + refresh_token -> setSession
 */
export async function setRecoverySessionFromUrl(url: string): Promise<{ error: string | null }> {
  try {
    const getParams = (raw: string) => {
      const params = new URLSearchParams(
        raw.startsWith("?") || raw.startsWith("#") ? raw.slice(1) : raw
      );
      return params;
    };

    const query = url.includes("?") ? "?" + url.split("?")[1].split("#")[0] : "";
    const hash = url.includes("#") ? "#" + url.split("#")[1] : "";

    const qp = getParams(query);
    const hp = getParams(hash);

    // 1) Gestion des erreurs renvoyées par Supabase (ex: otp_expired)
    const err = qp.get("error") || hp.get("error");
    const errCode = qp.get("error_code") || hp.get("error_code");
    const errDesc = qp.get("error_description") || hp.get("error_description");

    if (err || errCode || errDesc) {
      const msg = errDesc
        ? decodeURIComponent(errDesc.replace(/\+/g, " "))
        : errCode || err || "Lien invalide";
      return { error: msg };
    }

    // 2) PKCE: code -> exchangeCodeForSession
    const code = qp.get("code") || hp.get("code");
    const type = qp.get("type") || hp.get("type");

    if (type && type !== "recovery") {
      return { error: "Type de lien non supporté" };
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { error: error?.message ?? null };
    }

    // 3) Implicit: access/refresh tokens
    const access_token = qp.get("access_token") || hp.get("access_token");
    const refresh_token = qp.get("refresh_token") || hp.get("refresh_token");

    if (!access_token || !refresh_token) {
      return { error: "Lien invalide (tokens/code manquants)" };
    }

    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: error?.message ?? null };
  } catch (err: any) {
    return { error: err?.message ?? "Impossible de valider le lien" };
  }
}

export async function updatePasswordFromRecovery(newPassword: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  } catch (err: any) {
    return { error: err?.message ?? "Impossible de mettre à jour le mot de passe" };
  }
}

export async function deleteAccount(): Promise<{ error: string | null }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
