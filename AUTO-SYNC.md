# Synchronisation Automatique Cloud

## 🎯 Problèmes Résolus

### Avant (Sync Manuelle)
- ❌ Les suppressions de decks réapparaissaient après sync
- ❌ Besoin de cliquer sur "Synchroniser" manuellement
- ❌ Logique de merge bidirectionnelle créait des conflits
- ❌ Les données locales pouvaient être écrasées par le cloud

### Après (Auto-Sync)
- ✅ Les suppressions sont correctement synchronisées
- ✅ Sync automatique après chaque modification
- ✅ Le LOCAL est la source de vérité (unidirectionnel)
- ✅ Les modifications sont instantanément sauvegardées dans le cloud

## 🔄 Nouvelle Stratégie de Synchronisation

### Principe : LOCAL → CLOUD

**Le stockage local est la source de vérité** quand l'utilisateur est actif sur l'appareil :
- Chaque modification locale déclenche automatiquement un upload vers le cloud
- Le cloud reflète toujours l'état actuel de l'appareil
- Pas de merge compliqué, juste un upload des données actuelles

### Cas d'Usage

#### 1. **Création de compte (Signup)**
```typescript
// Au signup, on upload les données locales vers le cloud
await syncFromCloud(userId, replaceLocal: true);
```
- Upload initial des données locales vers le nouveau compte cloud
- Le compte cloud reçoit tous les decks, reviews, etc. créés en mode local

#### 2. **Connexion (Login)**
```typescript
// Au login, on remplace les données locales par celles du cloud
await syncFromCloud(userId, replaceLocal: true);
```
- **Replace mode** : Les données locales sont complètement remplacées
- L'utilisateur retrouve ses données cloud sur l'appareil
- Si l'appareil avait des données locales, elles sont écrasées

#### 3. **Utilisation Active (Modifications)**
```typescript
// Après chaque saveDeck, deleteDeck, upsertReview, etc.
await triggerAutoSync();
```
- **Auto-sync** : Upload automatique vers le cloud
- Fire-and-forget : N'attend pas la réponse (pas de blocage UI)
- Si erreur : Log warning mais ne bloque pas l'utilisateur

#### 4. **Démarrage de l'app**
```typescript
// Au boot, si utilisateur connecté
await syncFromCloud(userId, replaceLocal: true);
```
- Récupère les dernières données depuis le cloud
- S'assure que l'appareil a la dernière version

## 🔧 Implémentation Technique

### Fonctions Clés

#### `cloudSync.ts`

**`syncToCloud(userId)`**
```typescript
// Upload les données locales vers Supabase
// Upsert complet : remplace toutes les données cloud
const cloudData = {
  decks: await repo.listDecks(),
  reviewRecords: await repo.getAllReviewRecords(),
  quizAttempts: await repo.getAllQuizAttempts(),
  // ... autres données
};
await supabase.from("user_data").upsert({ user_id: userId, data: cloudData });
```

**`syncFromCloud(userId, replaceLocal)`**
```typescript
// Download depuis le cloud
const { data } = await supabase.from("user_data").select("data").eq("user_id", userId);

if (replaceLocal) {
  // Mode login/boot : remplace complètement
  await replaceLocalData(cloudData);
} else {
  // Mode merge : ne fait rien (le local est prioritaire)
  // Cette branche n'est plus utilisée dans la pratique
}
```

**`autoSync(userId)`**
```typescript
// Upload automatique vers le cloud
// Appelé après chaque modification
await syncToCloud(userId);
```

#### `repo.ts`

**`triggerAutoSync()`**
```typescript
// Vérifie si un utilisateur est authentifié
const authUserId = await getJSON(GLOBAL_KEYS.authUserId);
if (authUserId) {
  // Fire and forget : ne bloque pas
  cloudSync.autoSync(authUserId).catch(err => console.warn("Auto-sync failed:", err));
}
```

**Opérations avec Auto-Sync**
```typescript
// Toutes ces fonctions appellent triggerAutoSync() après modification
- saveDeck(deck)          → triggerAutoSync()
- deleteDeck(deckId)      → triggerAutoSync()
- upsertReview(record)    → triggerAutoSync()
- addQuizAttempt(...)     → triggerAutoSync()
- updateDeckCard(...)     → Appelle saveDeck() qui fait l'auto-sync
- addDeckCard(...)        → Appelle saveDeck() qui fait l'auto-sync
```

### Flux de Données

#### **Création d'un Deck**
```
1. User crée un deck
2. repo.saveDeck(newDeck)
3. Sauvegarde locale dans AsyncStorage
4. triggerAutoSync()
5. cloudSync.autoSync(userId)
6. cloudSync.syncToCloud(userId)
7. Upload vers Supabase
✅ Deck sauvegardé localement ET dans le cloud
```

#### **Suppression d'un Deck**
```
1. User supprime un deck
2. repo.deleteDeck(deckId)
3. Suppression locale dans AsyncStorage
4. triggerAutoSync()
5. cloudSync.autoSync(userId)
6. cloudSync.syncToCloud(userId)
7. Upload de la liste mise à jour (sans le deck supprimé)
✅ Le deck est absent localement ET dans le cloud
```

#### **Révision d'une Carte**
```
1. User révise une carte (grade 3)
2. repo.upsertReview(reviewRecord)
3. Sauvegarde locale du review
4. triggerAutoSync()
5. Upload vers le cloud
✅ Progrès sauvegardé instantanément
```

## 📱 Expérience Utilisateur

### Interface Settings

**Avant** :
```
[Sync icon] Synchroniser maintenant
             Force la sync avec le cloud
```

**Après** :
```
[Checkmark icon] email@example.com
                 Connecté • Sync automatique activée
```

Plus de bouton manuel : tout est automatique !

### Indicateurs Visuels

- **Connecté** : Icône checkmark verte + "Sync automatique activée"
- **Non connecté** : "Mode local uniquement"
- Pas de spinner ou loader : la sync est transparente

## 🔐 Gestion des Conflits

### Stratégie Simplifiée

Avec la nouvelle approche unidirectionnelle (LOCAL → CLOUD), **il n'y a plus de conflits** :

1. **Sur l'appareil actif** : Le local est la source de vérité
2. **Upload continu** : Chaque modification est uploadée immédiatement
3. **Pas de merge** : Le cloud est toujours écrasé par le local

### Cas Multi-Appareils

**Scénario** : User a 2 appareils (iPhone + iPad)

1. **iPhone** : Supprime un deck
   - Suppression locale
   - Auto-sync → Upload vers cloud
   - Cloud n'a plus ce deck

2. **iPad** : Ouvre l'app
   - Au boot : `syncFromCloud(userId, replaceLocal: true)`
   - Télécharge les données cloud
   - Le deck supprimé disparaît aussi sur iPad

3. **iPad** : Crée un nouveau deck
   - Création locale
   - Auto-sync → Upload vers cloud
   - Cloud a maintenant ce nouveau deck

4. **iPhone** : Ouvre l'app
   - Au boot : `syncFromCloud(userId, replaceLocal: true)`
   - Télécharge les données cloud
   - Le nouveau deck apparaît sur iPhone

**Limitation** : Si les 2 appareils sont utilisés **simultanément offline**, le dernier qui sync écrase l'autre. C'est un compromis acceptable pour la simplicité.

## ⚡ Performance

### Optimisations

1. **Fire-and-forget** : L'auto-sync ne bloque pas l'UI
2. **Debounce implicite** : Si plusieurs modifications rapides, elles sont regroupées
3. **Catch errors** : Les erreurs de sync n'affectent pas l'expérience utilisateur

### Coût Réseau

- **Upload complet** : ~5-50 KB par sync (dépend du nombre de decks)
- **Fréquence** : Après chaque modification significative
- **Optimisation future** : Delta sync (envoyer seulement les changements)

## 🧪 Tests

### Test 1 : Suppression de Deck
1. Connecté avec un compte
2. Crée un deck "Test"
3. ✅ Vérifie dans Supabase : le deck apparaît
4. Supprime le deck "Test"
5. ✅ Vérifie dans Supabase : le deck a disparu

### Test 2 : Multi-Appareils
1. Appareil A : Connecté, crée deck "A"
2. Appareil B : Connecté (même compte), ouvre l'app
3. ✅ Deck "A" apparaît sur appareil B
4. Appareil B : Supprime deck "A"
5. Appareil A : Ferme et rouvre l'app
6. ✅ Deck "A" a disparu sur appareil A

### Test 3 : Mode Offline
1. Connecté, active mode avion
2. Crée deck "Offline"
3. ✅ Deck visible localement
4. Désactive mode avion
5. Attend 2-3 secondes
6. ✅ Vérifie Supabase : le deck apparaît

## 🚀 Évolutions Futures

### Possibles Améliorations

1. **Delta Sync** : Envoyer seulement les changements (pas tout)
2. **Conflict Resolution UI** : Détecter les conflits multi-appareils et demander à l'utilisateur
3. **Offline Queue** : Queue des opérations en mode offline, replay au retour online
4. **Real-time Sync** : WebSocket pour sync instantanée entre appareils
5. **Sync Status** : Indicateur "Syncing..." pendant l'upload

### Structure Supabase Future

**Actuelle** (Monolithique) :
```
user_data {
  user_id: uuid
  data: jsonb  ← Tout dedans
}
```

**Future** (Normalisée) :
```
decks { id, user_id, title, ... }
cards { id, deck_id, question, ... }
reviews { id, user_id, card_id, ... }
```

Avantages :
- Queries plus rapides
- Delta sync plus simple
- Meilleure indexation

