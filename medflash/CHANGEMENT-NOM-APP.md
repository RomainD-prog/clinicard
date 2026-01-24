# 📝 Changement de nom : MedFlash → CliniCard

*12 janvier 2026*

---

## ✅ Modifications effectuées

### Nom de l'application

Le nom visible de l'app a été changé de **MedFlash** à **CliniCard** dans tous les endroits visibles par l'utilisateur.

---

## 📁 Fichiers modifiés

### 1. `app.json`
```json
{
  "expo": {
    "name": "CliniCard",  // ✅ Changé (nom affiché sur le téléphone)
    "slug": "medflash"    // ⚠️ Conservé (URL/identifiant technique)
  }
}
```

**Impact** :
- Le nom affiché sur l'écran d'accueil du téléphone sera **CliniCard**
- Le slug reste `medflash` (pas d'impact sur l'infrastructure)

---

### 2. `app/onboarding/index.tsx`
```tsx
<Text style={styles.logoText}>
  CliniCard  // ✅ Changé
</Text>
```

**Impact** : L'écran d'onboarding affiche maintenant "CliniCard"

---

### 3. `app/(tabs)/settings.tsx`
```tsx
// Footer
<Text>
  CliniCard • MVP  // ✅ Changé
</Text>

// Notifications
title: "Révision CliniCard",  // ✅ Changé (2 occurrences)
```

**Impact** :
- Le footer des réglages affiche "CliniCard • MVP"
- Les notifications quotidiennes affichent "Révision CliniCard"

---

### 4. `src/services/notifications.ts`
```typescript
title: params.title ?? "Révision CliniCard",  // ✅ Changé
```

**Impact** : Titre par défaut des notifications changé en "CliniCard"

---

## ⚠️ Ce qui N'A PAS été changé (volontairement)

### Infrastructure technique
- ✅ Bundle IDs : `com.romaindurieux.medflash` (conservé)
- ✅ Slug Expo : `medflash` (conservé)
- ✅ Project ID EAS : `933f84d1-d77d-469a-828e-ac40383fed30` (conservé)
- ✅ Variables d'environnement : Toutes conservées
- ✅ Backend URL : `https://medflash-api.tri-pacer.fr` (conservé)
- ✅ Dossier du projet : `/medflash` (conservé)
- ✅ Nom du repo Git : `medflash` (conservé)

### Documentation
- ✅ Tous les fichiers de documentation gardent "MedFlash"
- ✅ README, CHECKLIST, guides, etc. : Non modifiés

**Pourquoi ?**
- Éviter de tout casser
- Les bundle IDs ne peuvent pas être changés facilement une fois publiés
- L'infrastructure reste cohérente
- Seul le nom visible par l'utilisateur change

---

## 🧪 Vérification

Pour vérifier que tous les changements sont appliqués :

```bash
# Vérifier le nom dans app.json
cat app.json | grep "name"
# Devrait afficher: "name": "CliniCard",

# Vérifier qu'il ne reste plus de "MedFlash" dans le code de l'app
grep -r "MedFlash" app/ src/ --include="*.tsx" --include="*.ts" | grep -v "medflash-logo"
# Devrait retourner 0 résultats
```

✅ **Vérification effectuée : 0 occurrences de "MedFlash" dans le code de l'app**

---

## 📱 Résultat visible par l'utilisateur

### Avant
- Nom sur l'écran d'accueil : **MedFlash**
- Écran onboarding : **MedFlash**
- Notifications : **Révision MedFlash**
- Footer settings : **MedFlash • MVP**

### Après
- Nom sur l'écran d'accueil : **CliniCard** ✅
- Écran onboarding : **CliniCard** ✅
- Notifications : **Révision CliniCard** ✅
- Footer settings : **CliniCard • MVP** ✅

---

## 🚀 Prochaines étapes

### Pour tester le changement

**En développement** :
```bash
npx expo start -c
```
Le cache sera nettoyé et le nouveau nom apparaîtra.

**Pour un build** :
```bash
eas build --profile preview --platform android
```
L'APK généré affichera "CliniCard" comme nom d'app.

---

## 📝 Notes importantes

### Si vous voulez changer le logo aussi

Le logo actuel est toujours `medflash-logo.png`. Si vous voulez le changer :

1. Créer un nouveau logo "CliniCard"
2. Remplacer `assets/images/medflash-logo.png`
3. Ou créer `assets/images/clinicard-logo.png` et modifier les imports

### Pour les stores

Quand vous publierez sur les stores, vous pourrez mettre :
- **Nom de l'app** : CliniCard
- **Description** : Mentionner CliniCard
- **Bundle ID** : Reste `com.romaindurieux.medflash` (technique, invisible)

---

## ✅ Résumé

| Élément | Avant | Après | Statut |
|---------|-------|-------|--------|
| Nom visible app | MedFlash | CliniCard | ✅ Changé |
| Écran onboarding | MedFlash | CliniCard | ✅ Changé |
| Notifications | MedFlash | CliniCard | ✅ Changé |
| Footer settings | MedFlash | CliniCard | ✅ Changé |
| Bundle ID iOS | medflash | medflash | ⚠️ Conservé |
| Package Android | medflash | medflash | ⚠️ Conservé |
| Backend URL | medflash-api | medflash-api | ⚠️ Conservé |
| Documentation | MedFlash | MedFlash | ⚠️ Conservé |

---

**Le changement de nom est terminé ! L'app s'appelle maintenant CliniCard pour les utilisateurs. 🎉**

*L'infrastructure technique reste "medflash" pour éviter tout problème.*

