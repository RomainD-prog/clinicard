# 🔐 Système d'Authentification MedFlash

Ce document explique le fonctionnement du système d'authentification et de synchronisation cloud mis en place dans MedFlash.

## 📖 Vue d'ensemble

MedFlash utilise maintenant **Supabase** pour :
- ✅ Authentification utilisateur (email/password)
- ✅ Synchronisation des données dans le cloud
- ✅ Accès multi-appareils
- ✅ Backup automatique des decks et du progrès

## 🏗️ Architecture

### Modes de fonctionnement

L'app fonctionne en **2 modes** :

#### 1. **Mode Local** (par défaut)
- Les données sont stockées uniquement sur l'appareil (AsyncStorage)
- Pas besoin de compte utilisateur
- Fonctionne offline
- ⚠️ Données perdues si l'app est désinstallée

#### 2. **Mode Cloud** (avec authentification)
- Les données sont synchronisées avec Supabase
- Nécessite un compte utilisateur
- Accès depuis plusieurs appareils
- ✅ Backup automatique dans le cloud

### Passage du mode Local au mode Cloud

Quand un utilisateur crée un compte :
1. Ses données locales sont automatiquement uploadées vers Supabase
2. La synchronisation automatique est activée
3. Les données sont conservées à la fois en local et dans le cloud
4. À chaque démarrage de l'app, les données sont synchronisées

## 📁 Structure des fichiers

### Configuration

```
src/config/
├── supabase.ts          # Configuration Supabase (URL, API key)
└── env.ts               # Configuration existante (inchangée)
```

**Impact** : `supabase.ts` lit les variables d'environnement du fichier `.env`

### Services

```
src/services/
├── authService.ts       # Gestion de l'authentification
├── cloudSync.ts         # Synchronisation local ↔ cloud
└── supabaseClient.ts    # Client Supabase singleton
```

**Fonctionnement** :

1. **`supabaseClient.ts`** :
   - Initialise le client Supabase
   - Configure le stockage sécurisé des tokens (expo-secure-store)
   - Les tokens sont chiffrés dans le Keychain iOS / Keystore Android

2. **`authService.ts`** :
   - `signup()` : Crée un nouveau compte
   - `login()` : Connecte un utilisateur
   - `logout()` : Déconnecte l'utilisateur
   - `getCurrentUser()` : Récupère l'utilisateur connecté
   - `resetPassword()` : Envoie un email de réinitialisation
   - `onAuthStateChange()` : Écoute les changements d'authentification

3. **`cloudSync.ts`** :
   - `syncToCloud()` : Upload les données locales vers Supabase
   - `syncFromCloud()` : Download les données de Supabase vers local
   - `mergeData()` : Fusionne intelligemment les données (garde le plus récent)
   - `autoSync()` : Synchronisation automatique en arrière-plan

### Écrans

```
app/auth/
├── login.tsx            # Écran de connexion
└── signup.tsx           # Écran de création de compte
```

**Impact** : Nouveaux écrans accessibles depuis Settings

### Store

```
src/store/
└── useAppStore.ts       # Store Zustand (modifié)
```

**Modifications** :
- Ajout de `authUser` (utilisateur authentifié)
- Ajout de `setAuthUser()`, `logout()`, `syncUserData()`, `checkAuthStatus()`
- `bootstrap()` vérifie maintenant si un utilisateur est connecté au démarrage

### Storage

```
src/storage/
└── repo.ts              # Repository (modifié)
```

**Modifications** :
- Ajout d'aliases pour la synchronisation cloud :
  - `getAllReviewRecords()`
  - `getAllQuizAttempts()`
  - `getReviewRecord()`
  - `saveReviewRecord()`

## 🔄 Flux d'authentification

### Création de compte

```
1. User clique sur "Créer un compte" (Settings)
   ↓
2. Remplit email + password (signup.tsx)
   ↓
3. authService.signup() → Supabase Auth
   ↓
4. Si succès :
   - Store : setAuthUser(user)
   - Store : syncUserData(userId)
     ↓
     - cloudSync.syncFromCloud() : Vérifie si données cloud existent
     - cloudSync.syncToCloud() : Upload données locales
   ↓
5. Redirection vers l'app principale
```

### Connexion

```
1. User clique sur "Se connecter" (Settings)
   ↓
2. Remplit email + password (login.tsx)
   ↓
3. authService.login() → Supabase Auth
   ↓
4. Si succès :
   - Store : setAuthUser(user)
   - Store : syncUserData(userId)
     ↓
     - cloudSync.syncFromCloud() : Download données cloud
     - cloudSync.syncToCloud() : Upload données locales (merge)
     - Store : refreshDecks() : Actualise l'UI
   ↓
5. Redirection vers l'app principale
```

### Démarrage de l'app

```
1. App démarre
   ↓
2. useAppStore.bootstrap()
   ↓
3. Charge toutes les données locales
   ↓
4. checkAuthStatus()
   ↓
5. authService.getCurrentUser()
   - Vérifie si un token valide existe dans SecureStore
   ↓
6. Si user connecté :
   - Store : setAuthUser(user)
   - cloudSync.autoSync(userId) : Sync en arrière-plan
   - Store : refreshDecks() : Actualise l'UI
```

### Déconnexion

```
1. User clique sur "Déconnexion" (Settings)
   ↓
2. Confirmation (Alert)
   ↓
3. Store : logout()
   ↓
4. authService.logout() → Supabase
   - Supprime le token de SecureStore
   ↓
5. Store : setAuthUser(null)
   ↓
6. Les données locales restent sur l'appareil
   (User peut continuer en mode local)
```

## 🔒 Sécurité

### Stockage des tokens

- **iOS** : Keychain (chiffrement matériel)
- **Android** : Keystore (chiffrement matériel)
- **Web** : localStorage (fallback, moins sécurisé)

### Row Level Security (RLS)

Supabase applique des **policies** pour que :
- Chaque user ne peut voir que SES données
- Impossible d'accéder aux données des autres users
- Même si quelqu'un obtient l'API key

### Données sensibles

- Le fichier `.env` contient les credentials Supabase
- **JAMAIS** commit `.env` dans Git
- Utilise `.env.example` pour partager la structure

## 🔄 Stratégie de synchronisation

### Merge des données

Lors de la sync, les données sont **fusionnées** intelligemment :

1. **Decks** : Comparaison par `createdAt`
   - Si deck existe seulement en local → Upload vers cloud
   - Si deck existe seulement dans cloud → Download en local
   - Si deck existe des 2 côtés → Garde le plus récent (`createdAt`)

2. **Review records** : Comparaison par `lastReviewedAt`
   - Garde le record avec le `lastReviewedAt` le plus récent

3. **Settings** : Le cloud a toujours priorité
   - `level`, `creditsBalance`, `isSubscribed` viennent du cloud

### Quand la sync se déclenche

1. **Au démarrage de l'app** : Si user connecté
2. **Après login** : Sync bidirectionnelle (upload + download)
3. **Après signup** : Upload des données locales
4. **Manuel** : Bouton "Synchroniser maintenant" dans Settings

### Gestion des conflits

Si l'user modifie des données sur 2 appareils différents :
- Le **plus récent** gagne (basé sur les timestamps)
- Pas de perte de données (les 2 versions sont mergées)

## 📦 Base de données Supabase

### Table `user_data`

```sql
CREATE TABLE user_data (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  data JSONB,                    -- Toutes les données user
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Structure du champ `data` (JSONB)

```json
{
  "userId": "u_...",
  "decks": [...],                // Tous les decks
  "reviewRecords": [...],        // Tous les review records
  "quizAttempts": [...],         // Tous les quiz attempts
  "freeImportsUsed": 0,
  "creditsBalance": 0,
  "isSubscribed": false,
  "level": "PASS",
  "lastSyncAt": 1234567890
}
```

## 🧪 Tests

### Tester la création de compte

1. Settings > Créer un compte
2. Entre un email et password
3. Vérifie dans Supabase Dashboard > Authentication > Users
4. Vérifie dans Supabase Dashboard > Table Editor > user_data

### Tester la synchronisation

1. Crée un deck sur l'appareil A
2. Déconnecte-toi
3. Connecte-toi sur l'appareil B avec le même compte
4. Le deck doit apparaître sur l'appareil B ✅

### Tester le mode local → cloud

1. Utilise l'app en mode local (sans compte)
2. Crée quelques decks
3. Crée un compte
4. Vérifie que les decks locaux sont maintenant dans Supabase ✅

## 📝 Scripts disponibles

### Configuration initiale

```bash
# Lire le guide complet
cat scripts/setup-supabase.md

# Créer le fichier .env
cp .env.example .env
# Puis édite .env avec tes credentials Supabase
```

### SQL Schema

```bash
# Exécuter dans Supabase SQL Editor
cat scripts/supabase-schema.sql
```

## 🚀 Déploiement

### Variables d'environnement

Pour le build de production, assure-toi de définir :

```bash
EXPO_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=ta_clé_anon
```

### EAS Build

```bash
# Ajouter dans eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "...",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
      }
    }
  }
}
```

Ou utilise les **secrets** EAS :

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://...
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJ...
```

## 🐛 Dépannage

### L'app reste en mode local

→ Vérifie que :
1. Le fichier `.env` existe et contient les bonnes valeurs
2. Tu as redémarré Expo après avoir créé `.env`
3. Les credentials Supabase sont corrects

### "Failed to sync"

→ Vérifie que :
1. La table `user_data` existe dans Supabase
2. Les policies RLS sont correctement configurées
3. L'utilisateur est bien authentifié

### Données non synchronisées

→ Force la sync :
1. Settings > Synchroniser maintenant
2. Vérifie les logs dans la console
3. Vérifie les données dans Supabase Dashboard

## 📚 Ressources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Zustand](https://github.com/pmndrs/zustand)

## 🎯 Prochaines étapes

- [ ] Ajouter OAuth (Google, Apple)
- [ ] Implémenter la suppression de compte
- [ ] Ajouter une synchronisation en temps réel (Realtime subscriptions)
- [ ] Optimiser la taille des données JSONB (compression)
- [ ] Ajouter des analytics sur l'usage

