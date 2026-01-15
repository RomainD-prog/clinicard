# Isolation des Données Multi-Utilisateurs

## 🎯 Problème Résolu

Avant cette mise à jour, les données locales (decks, reviews, stats) étaient partagées entre tous les utilisateurs sur un même appareil. Cela signifiait que :
- Quand tu créais un nouveau compte, tu voyais les données de l'ancien utilisateur local
- Les données n'étaient pas isolées par compte utilisateur
- Le logout ne supprimait pas les données visibles

## ✅ Solution Implémentée

### 1. **Système de Clés Préfixées par Utilisateur**

Toutes les données AsyncStorage sont maintenant préfixées avec l'ID utilisateur :

**Avant** :
```
mf:decks → [deck1, deck2, ...]
mf:reviews → [review1, review2, ...]
```

**Après** :
```
mf:user:user123:decks → [deck1, deck2, ...]
mf:user:user456:decks → [deck3, deck4, ...]
mf:user:user123:reviews → [review1, review2, ...]
mf:user:user456:reviews → [review3, review4, ...]
```

### 2. **Gestion des Utilisateurs**

#### **Utilisateur Local (sans compte)**
- Génère automatiquement un `userId` local : `u_local_xxxxx`
- Les données sont stockées sous ce userId
- Peut continuer à utiliser l'app sans compte

#### **Utilisateur Authentifié (avec compte)**
- Utilise l'ID Supabase comme userId : `uuid-from-supabase`
- Les données sont isolées sous cet userId
- Les données locales sont migrées vers le cloud lors du signup

### 3. **Flux d'Authentification**

#### **Signup (Création de compte)**
```typescript
1. User crée un compte avec email/password
2. Récupère userId de Supabase (ex: abc-123-def)
3. Définit ce userId comme utilisateur actuel
4. Upload les données locales vers le cloud
5. Refresh l'interface avec les données du nouvel utilisateur
```

#### **Login (Connexion)**
```typescript
1. User se connecte avec email/password
2. Récupère userId de Supabase
3. Définit ce userId comme utilisateur actuel
4. Sync les données depuis le cloud
5. Charge les données de cet utilisateur dans l'interface
```

#### **Logout (Déconnexion)**
```typescript
1. Récupère l'userId actuel
2. Efface TOUTES les données de cet utilisateur (decks, reviews, stats, etc.)
3. Réinitialise l'état de l'application
4. Génère un nouveau userId local pour la session non authentifiée
5. L'interface est maintenant vide pour le nouvel utilisateur local
```

### 4. **Fonctions Clés**

#### `repo.ts`
```typescript
// Obtenir l'userId actuel (auth ou local)
await getCurrentUserId()

// Définir l'utilisateur authentifié
await setCurrentAuthUserId(userId)

// Effacer les données d'un utilisateur
await clearUserData(userId)

// Obtenir une clé préfixée pour l'utilisateur actuel
await getUserKey("decks") // → "mf:user:abc123:decks"
```

#### `useAppStore.ts`
```typescript
// Logout avec nettoyage complet
logout: async () => {
  const currentUser = get().authUser;
  if (currentUser) {
    await repo.clearUserData(currentUser.id);
    await repo.setCurrentAuthUserId(null);
  }
  // ... reset de l'état
}

// Vérification au démarrage
checkAuthStatus: async () => {
  const user = await authService.getCurrentUser();
  if (user) {
    await repo.setCurrentAuthUserId(user.id);
    // ... chargement des données
  }
}
```

## 🔐 Sécurité et Isolation

### **Clés Globales (Non isolées)**
Ces données sont partagées entre tous les utilisateurs :
- `theme_mode` : Préférence de thème (clair/sombre)
- `dark_mode` : Mode sombre activé
- `mf:authUserId` : ID de l'utilisateur authentifié actuellement

### **Clés Utilisateur (Isolées)**
Ces données sont uniques par utilisateur :
- `decks` : Cours et flashcards
- `reviews` : Historique de révision
- `quizAttempts` : Tentatives de QCM
- `reviewStats` : Statistiques (streak, doneToday)
- `creditsBalance` : Crédits restants
- `freeImportsUsed` : Imports gratuits utilisés
- `isSubscribed` : Statut d'abonnement
- `reminderEnabled/Hour/Minute` : Paramètres de rappel
- `onboardingDone` : Statut de l'onboarding
- `jobs` : Jobs de génération
- `level` : Niveau d'étude (PASS/EDN/etc.)

## 🧪 Tests à Effectuer

### Test 1 : Création de Compte
1. Utilise l'app sans compte (crée quelques decks)
2. Crée un compte avec un email
3. ✅ Les decks locaux doivent être visibles et sauvegardés dans le cloud

### Test 2 : Logout
1. Connecté avec un compte qui a des decks
2. Se déconnecter
3. ✅ L'app doit être vide (aucun deck visible)
4. ✅ Un nouveau userId local est généré

### Test 3 : Multi-Comptes
1. Crée un compte A avec quelques decks
2. Se déconnecter
3. Crée un compte B avec d'autres decks
4. ✅ Les decks de A ne doivent pas être visibles dans B
5. Se reconnecter au compte A
6. ✅ Les decks de A doivent réapparaître

### Test 4 : Isolation Locale
1. Utilise l'app sans compte (crée des decks)
2. Se déconnecter (sans avoir créé de compte)
3. ✅ Les decks doivent être effacés
4. ✅ Tu commences avec une session locale vide

## 📝 Notes Importantes

### Migration des Anciennes Données
Si des utilisateurs ont déjà utilisé l'app avec l'ancien système :
- Les données existantes resteront dans les anciennes clés (`mf:decks`, etc.)
- Au premier lancement avec la nouvelle version, un `userId` local sera généré
- Les données seront accessibles sous ce nouveau userId
- **Important** : Les anciennes données ne seront PAS automatiquement migrées

### Script de Migration (Si Nécessaire)
Si tu veux migrer les anciennes données vers le nouveau système, tu peux créer un script de migration :

```typescript
// scripts/migrate-user-data.ts
async function migrateOldData() {
  // 1. Lire les anciennes clés
  const oldDecks = await AsyncStorage.getItem("mf:decks");
  const oldReviews = await AsyncStorage.getItem("mf:reviews");
  // ... autres clés
  
  // 2. Générer un userId local
  const userId = await getCurrentUserId();
  
  // 3. Copier vers les nouvelles clés préfixées
  if (oldDecks) {
    await AsyncStorage.setItem(`mf:user:${userId}:decks`, oldDecks);
  }
  // ... autres données
  
  // 4. Supprimer les anciennes clés
  await AsyncStorage.removeItem("mf:decks");
  await AsyncStorage.removeItem("mf:reviews");
  // ... autres clés
}
```

## 🚀 Avantages

1. **Isolation Complète** : Chaque compte a ses propres données
2. **Sécurité** : Un utilisateur ne peut pas voir les données d'un autre
3. **Logout Propre** : Les données sont effacées à la déconnexion
4. **Multi-Device** : Les données sont synchronisées via le cloud
5. **Offline-First** : Fonctionne toujours sans compte avec un userId local

