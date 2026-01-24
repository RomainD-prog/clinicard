Patch: Google OAuth (Supabase + Expo)

Fichiers inclus:
- src/services/supabaseClient.ts (flowType = "pkce")
- src/services/authService.ts (signInWithGoogle)
- app/auth/login.tsx (bouton "Continuer avec Google")
- app/auth/signup.tsx (bouton "Continuer avec Google")

A faire apres application:
1) Supabase Dashboard -> Authentication -> Providers -> Google: renseigner Client ID + Secret.
2) Google Cloud Console: "Authorized redirect URI" = https://<PROJECT_REF>.supabase.co/auth/v1/callback
3) Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs: ajouter
   - medflash://
   - (optionnel dev) exp://... ou https://auth.expo.io/... si tu utilises Expo Go / proxy.
4) Redemarrer Metro: npx expo start -c

Note iOS:
Si tu proposes Google/FB/etc. comme methode de connexion, Apple impose generalement d'offrir aussi "Sign in with Apple" (sauf exceptions).
