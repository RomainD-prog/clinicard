/**
 * Configuration Supabase
 * 
 * Ce fichier configure la connexion à Supabase (backend as a service).
 * Il utilise les variables d'environnement pour l'URL et la clé API.
 * 
 * Pour l'instant, on utilise des valeurs placeholder. Pour utiliser en production :
 * 1. Créer un compte sur https://supabase.com
 * 2. Créer un nouveau projet
 * 3. Remplacer les valeurs ci-dessous par vos vraies credentials
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key-here";

// Active/désactive le mode cloud
// Si false, l'app fonctionne en mode 100% local (comme avant)
export const CLOUD_SYNC_ENABLED = SUPABASE_URL !== "https://your-project.supabase.co";

