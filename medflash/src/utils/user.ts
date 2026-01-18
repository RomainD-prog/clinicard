import type { AuthUser } from "../services/authService";

/**
 * Retourne des initiales lisibles pour l'avatar (2 lettres max).
 * - Priorité au prénom/nom si dispo
 * - Sinon dérive depuis l'email
 */
export function userInitials(user: AuthUser | null | undefined): string {
  if (!user) return "MF";

  const fn = (user.firstName ?? "").trim();
  const ln = (user.lastName ?? "").trim();

  let out = "";
  if (fn) out += fn[0];
  if (ln) out += ln[0];
  if (out) return out.toUpperCase();

  const email = (user.email ?? "").trim();
  if (!email) return "MF";

  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);

  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return local.slice(0, 2).toUpperCase() || "MF";
}
