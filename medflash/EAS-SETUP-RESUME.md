# ✅ Configuration EAS - Résumé

*Mis à jour : 12 janvier 2026*

---

## 🎉 Ce qui a été corrigé et complété

### 1. Correction de `eas.json`

**Problème initial** :
```
- "build.preview.android.package" is not allowed
- "build.preview.ios.bundleIdentifier" is not allowed
- "build.production.android.buildType" must be one of [apk, app-bundle]
```

**Solution appliquée** :
- ✅ Bundle IDs déplacés de `eas.json` vers `app.json` (nouveau format EAS v7+)
- ✅ `buildType` changé de `"aab"` à `"app-bundle"`
- ✅ Fichier `eas.json` maintenant valide

### 2. Mise à jour de `app.json`

**Ajouts** :
```json
{
  "ios": {
    "bundleIdentifier": "com.romaindurieux.medflash",
    "buildNumber": "1",
    "infoPlist": {
      "NSCameraUsageDescription": "...",
      "NSPhotoLibraryUsageDescription": "..."
    }
  },
  "android": {
    "package": "com.romaindurieux.medflash",
    "versionCode": 1,
    "permissions": [
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

✅ Plugins ajoutés : `expo-document-picker`, `expo-secure-store`

### 3. Variables d'environnement

**Problème initial** :
```bash
eas secret:create  # Commande dépréciée
```

**Solution** :
- ✅ Script créé : `scripts/setup-eas-env.sh`
- ✅ Utilisation de la nouvelle commande : `eas env:create`
- ✅ Variables à créer :
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_MOCK_API`

---

## 📝 Ce qu'il reste à faire (15 min)

### Étape finale : Créer les variables d'environnement

**Option 1 : Via script (RECOMMANDÉ)**
```bash
cd /Users/romain.durieux/Documents/medflash
bash scripts/setup-eas-env.sh
```

**Option 2 : Manuellement**

Pour chaque variable, exécuter DEUX fois (une pour `production`, une pour `preview`) :

```bash
# Exemple pour API_BASE_URL
eas env:create --name EXPO_PUBLIC_API_BASE_URL \
  --value https://medflash-api.tri-pacer.fr \
  --environment production \
  --visibility plaintext

eas env:create --name EXPO_PUBLIC_API_BASE_URL \
  --value https://medflash-api.tri-pacer.fr \
  --environment preview \
  --visibility plaintext
```

Répéter pour les 4 variables.

**Vérification** :
```bash
eas env:list
```

Vous devriez voir :
```
┌─────────────────────────────────┬─────────────┬────────────┐
│ Name                            │ Environment │ Visibility │
├─────────────────────────────────┼─────────────┼────────────┤
│ EXPO_PUBLIC_API_BASE_URL        │ production  │ plaintext  │
│ EXPO_PUBLIC_API_BASE_URL        │ preview     │ plaintext  │
│ EXPO_PUBLIC_SUPABASE_URL        │ production  │ plaintext  │
│ EXPO_PUBLIC_SUPABASE_URL        │ preview     │ plaintext  │
│ EXPO_PUBLIC_SUPABASE_ANON_KEY   │ production  │ plaintext  │
│ EXPO_PUBLIC_SUPABASE_ANON_KEY   │ preview     │ plaintext  │
│ EXPO_PUBLIC_MOCK_API            │ production  │ plaintext  │
│ EXPO_PUBLIC_MOCK_API            │ preview     │ plaintext  │
└─────────────────────────────────┴─────────────┴────────────┘
```

---

## 🧪 Test : Premier build

Une fois les variables créées, lancer un premier build de test :

```bash
# Build Android APK pour tester (10-15 min)
eas build --profile preview --platform android
```

Pendant le build :
- ✅ EAS va valider votre config
- ✅ Uploader le code
- ✅ Builder l'app dans le cloud
- ✅ Vous donner un lien pour télécharger l'APK

**Tester l'APK** :
1. Télécharger depuis le lien fourni
2. Installer sur un téléphone Android
3. Tester :
   - [ ] L'app se lance
   - [ ] Import d'un PDF fonctionne
   - [ ] Backend `medflash-api.tri-pacer.fr` est accessible
   - [ ] Auth Supabase fonctionne
   - [ ] Pas de crash majeur

---

## 📋 Checklist EAS complète

- [x] EAS CLI installé
- [x] Compte EAS créé
- [x] Projet EAS créé (ID: `933f84d1-d77d-469a-828e-ac40383fed30`)
- [x] `eas.json` créé et valide
- [x] `app.json` mis à jour avec bundle IDs
- [x] Plugins configurés
- [x] Script de setup variables créé
- [ ] **Variables d'environnement créées** ⬅️ À FAIRE MAINTENANT
- [ ] Premier build de test lancé
- [ ] APK testé sur device

---

## 📁 Fichiers créés/modifiés

```
medflash/
├── eas.json ✅ (créé et corrigé)
├── app.json ✅ (mis à jour)
├── scripts/
│   └── setup-eas-env.sh ✅ (nouveau)
├── GUIDE-EAS-CONFIG.md ✅ (nouveau)
└── EAS-SETUP-RESUME.md ✅ (ce fichier)
```

---

## 🐛 Erreurs résolues

| Erreur | Solution |
|--------|----------|
| `bundleIdentifier is not allowed` | Déplacé vers `app.json` |
| `package is not allowed` | Déplacé vers `app.json` |
| `buildType must be app-bundle` | Changé de `aab` à `app-bundle` |
| `secret:create deprecated` | Utiliser `eas env:create` |

---

## 🎯 Prochaines étapes après EAS

1. ✅ **Finaliser variables d'env** (15 min) - EN COURS
2. **Premier build de test** (1h)
3. **Privacy Policy** (1h)
4. **Screenshots** (2-3h)
5. **Comptes stores** (Apple Developer + Google Play)
6. **Build production** (2h)
7. **Submit aux stores** (1h)
8. **🎊 APP LIVE !**

---

## 📚 Documentation

- `GUIDE-EAS-CONFIG.md` : Guide complet de configuration EAS
- `CHECKLIST-PRODUCTION.md` : Checklist complète production
- `RESUME-PROGRESSION.md` : Vue d'ensemble progression

---

## 💡 Commande rapide

Pour finaliser immédiatement :

```bash
cd /Users/romain.durieux/Documents/medflash
bash scripts/setup-eas-env.sh
eas env:list  # Vérifier
eas build --profile preview --platform android  # Premier build
```

---

**Configuration EAS à 95% ! Il ne reste que les variables d'env à créer 🚀**

*Guide détaillé : `GUIDE-EAS-CONFIG.md`*

