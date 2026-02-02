# Medflash / CliniCard – patch “best fixes” (routing + startup crash)

Dézippe ce patch par-dessus ton projet.

## Ce que le patch fait

- Met à jour `app/_layout.tsx` pour déclarer l’écran d’onboarding sous le nom `onboarding`.
- Ajoute un script pour détecter automatiquement les routes en double.

## Étapes à faire après import

### 1) Résoudre l’erreur "conflicting screens" sur `onboarding`

L’erreur arrive quand **deux fichiers mappent la même route**. Exemple typique :

- `app/onboarding.tsx`
- `app/onboarding/index.tsx`

Ces deux-là créent tous les deux la route `/onboarding`.

✅ Garde **un seul** des deux :
- Soit tu gardes `app/onboarding/index.tsx` et tu supprimes `app/onboarding.tsx`
- Soit tu gardes `app/onboarding.tsx` et tu supprimes le dossier `app/onboarding/`

### 2) Vérifier automatiquement les doublons

Lance :

```bash
node scripts/check-expo-router-conflicts.js
```

Le script te liste les couples `X.tsx` vs `X/index.tsx` trouvés.

### 3) Note sur `expo-notifications` dans Expo Go

Le warning `expo-notifications ... not fully supported in Expo Go` est normal. Pour tester les notifications, il faut un **dev build** (expo-dev-client) ou un build EAS.
