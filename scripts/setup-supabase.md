# 🚀 Configuration Supabase pour MedFlash

Ce guide explique comment configurer Supabase pour activer l'authentification et la synchronisation cloud dans MedFlash.

## 📋 Prérequis

1. Compte Supabase (gratuit) : https://supabase.com
2. Node.js installé sur ton ordinateur

## 🎯 Étape 1 : Créer un projet Supabase

1. Va sur https://supabase.com et connecte-toi
2. Clique sur "New Project"
3. Remplis les informations :
   - **Name** : `medflash` (ou ce que tu veux)
   - **Database Password** : Choisis un mot de passe fort (garde-le précieusement)
   - **Region** : Choisis la région la plus proche (ex: `Europe (West)` pour la France)
4. Clique sur "Create new project"
5. ⏰ Attends 2-3 minutes que le projet soit créé

## 🔑 Étape 2 : Récupérer les credentials

1. Dans ton projet Supabase, va dans **Settings** (icône engrenage en bas à gauche)
2. Va dans **API**
3. Tu verras deux informations importantes :
   - **Project URL** : quelque chose comme `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** : une longue clé qui commence par `eyJhbGc...`

## 📝 Étape 3 : Créer le fichier .env

1. À la racine de ton projet MedFlash, crée un fichier `.env` :

```bash
# Dans le terminal, à la racine du projet :
touch .env
```

2. Ouvre le fichier `.env` et ajoute :

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...ta_longue_clé...
```

⚠️ **Remplace les valeurs** par tes vraies credentials de l'étape 2

3. Vérifie que `.env` est dans ton `.gitignore` (pour ne pas commit tes secrets)

## 🗄️ Étape 4 : Créer la table user_data

1. Dans Supabase, va dans **SQL Editor** (icône base de données à gauche)
2. Clique sur **New query**
3. Copie-colle le contenu du fichier `scripts/supabase-schema.sql`
4. Clique sur **Run** (ou appuie sur Ctrl/Cmd + Enter)
5. Tu devrais voir : "Success. No rows returned"

## 🔐 Étape 5 : Activer l'authentification par email

1. Va dans **Authentication** > **Providers** (dans le menu de gauche)
2. Assure-toi que **Email** est activé (c'est normalement le cas par défaut)
3. Tu peux aussi activer **Confirm email** si tu veux que les utilisateurs confirment leur email
   - ⚠️ En mode dev, désactive "Confirm email" pour aller plus vite

## ✅ Étape 6 : Tester la configuration

1. Redémarre ton serveur Expo :

```bash
npm start
```

2. Dans l'app, va dans **Settings (Réglages)**
3. Tu devrais voir une section **COMPTE** :
   - Si tu vois "Mode local uniquement" et les boutons "Se connecter" / "Créer un compte" → ✅ Tout est OK !
   - Si tu ne vois pas cette section → ❌ Vérifie ton fichier `.env`

4. Teste la création de compte :
   - Clique sur "Créer un compte"
   - Entre un email et un mot de passe (min 6 caractères)
   - Si ça marche, tu verras "Compte créé ! 🎉"
   - Tes données locales sont maintenant dans le cloud !

## 🔍 Vérifier que tout fonctionne

### Dans Supabase Dashboard :

1. **Voir les utilisateurs** : Authentication > Users
   - Tu devrais voir ton compte créé
   
2. **Voir les données** : Table Editor > user_data
   - Tu devrais voir une ligne avec ton user_id et tes données

### Dans l'app :

1. Déconnecte-toi (Settings > Déconnexion)
2. Reconnecte-toi avec le même email/password
3. Tes decks et cartes doivent toujours être là ✅

## 🐛 Dépannage

### "Cloud sync disabled" dans les settings

→ Vérifie que ton `.env` contient bien les bonnes valeurs et que tu as redémarré Expo

### "Failed to create user"

→ Vérifie que l'authentification par email est activée dans Supabase (Authentication > Providers)

### "Database error" lors de la sync

→ Vérifie que tu as bien exécuté le script SQL (étape 4)

### "Invalid API key"

→ Vérifie que tu as copié la **anon public key** et pas une autre clé

## 🎉 C'est tout !

Ton app MedFlash est maintenant configurée avec :
- ✅ Authentification par email/password
- ✅ Synchronisation automatique des données
- ✅ Backup cloud de tous les decks et progrès
- ✅ Accès multi-appareils

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase Auth avec React Native](https://supabase.com/docs/guides/auth/auth-helpers/react-native)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

