# 🚀 Guide de Configuration EAS - MedFlash

*Guide complet pour configurer Expo Application Services*

---

## ✅ Ce qui est déjà fait

- ✅ `eas.json` créé et corrigé
- ✅ `app.json` mis à jour avec bundle IDs
- ✅ Project ID EAS configuré : `933f84d1-d77d-469a-828e-ac40383fed30`
- ✅ Bundle identifiers définis :
  - iOS : `com.romaindurieux.medflash`
  - Android : `com.romaindurieux.medflash`

---

## 📝 Étapes restantes

### 1. Configurer les variables d'environnement EAS

**Option A : Via script (RECOMMANDÉ)**

```bash
cd /Users/romain.durieux/Documents/medflash
bash scripts/setup-eas-env.sh
```

**Option B : Manuellement**

Exécutez ces commandes une par une :

```bash
cd /Users/romain.durieux/Documents/medflash

# 1. API Backend URL
eas env:create --name EXPO_PUBLIC_API_BASE_URL \
  --value https://medflash-api.tri-pacer.fr \
  --environment production \
  --visibility plaintext

eas env:create --name EXPO_PUBLIC_API_BASE_URL \
  --value https://medflash-api.tri-pacer.fr \
  --environment preview \
  --visibility plaintext

# 2. Supabase URL
eas env:create --name EXPO_PUBLIC_SUPABASE_URL \
  --value https://fcynbbggrholkmxpuftu.supabase.co \
  --environment production \
  --visibility plaintext

eas env:create --name EXPO_PUBLIC_SUPABASE_URL \
  --value https://fcynbbggrholkmxpuftu.supabase.co \
  --environment preview \
  --visibility plaintext

# 3. Supabase Anon Key
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeW5iYmdncmhvbGtteHB1ZnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODYxOTYsImV4cCI6MjA4MzU2MjE5Nn0.CshjCKwclRzNJAI4BIruP1aYwTakeTx9SYKFYPxbmvI" \
  --environment production \
  --visibility plaintext

eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeW5iYmdncmhvbGtteHB1ZnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODYxOTYsImV4cCI6MjA4MzU2MjE5Nn0.CshjCKwclRzNJAI4BIruP1aYwTakeTx9SYKFYPxbmvI" \
  --environment preview \
  --visibility plaintext

# 4. Mock API (false)
eas env:create --name EXPO_PUBLIC_MOCK_API \
  --value false \
  --environment production \
  --visibility plaintext

eas env:create --name EXPO_PUBLIC_MOCK_API \
  --value false \
  --environment preview \
  --visibility plaintext
```

**Vérifier que les variables sont créées** :

```bash
eas env:list
```

Vous devriez voir vos 4 variables pour les environnements `production` et `preview`.

---

### 2. Vérifier la configuration

#### Vérifier eas.json

```bash
cat eas.json
```

Devrait afficher :
```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "channel": "production",
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### Vérifier app.json

```bash
cat app.json | grep -A 5 "ios"
cat app.json | grep -A 10 "android"
```

Devrait contenir :
- iOS : `"bundleIdentifier": "com.romaindurieux.medflash"`
- Android : `"package": "com.romaindurieux.medflash"`

---

### 3. Tester la configuration

#### Build de développement (pour tester)

**iOS Simulator** (nécessite un Mac) :
```bash
eas build --profile development --platform ios
```

**Android APK** (fonctionne partout) :
```bash
eas build --profile preview --platform android
```

Cette commande va :
1. Vérifier que `eas.json` est valide ✅
2. Vérifier que `app.json` est valide ✅
3. Uploader votre code vers EAS
4. Builder l'app dans le cloud (10-15 min)
5. Vous donner un lien pour télécharger l'APK

**Pendant le build**, vous pouvez suivre le log en direct dans le terminal.

---

## 🐛 Résolution des erreurs courantes

### Erreur : "eas.json is not valid"

✅ **CORRIGÉ** - Le fichier a été mis à jour avec la bonne syntaxe

### Erreur : "bundleIdentifier is not allowed"

✅ **CORRIGÉ** - Les bundle IDs ont été déplacés dans `app.json`

### Erreur : "secret:create command is deprecated"

✅ **CORRIGÉ** - Utiliser `eas env:create` à la place

### Erreur : "Project not found"

Assurez-vous d'être dans le bon répertoire :
```bash
cd /Users/romain.durieux/Documents/medflash
eas whoami  # Vérifier que vous êtes connecté
```

### Erreur : "Invalid credentials"

```bash
eas logout
eas login
```

---

## 📋 Checklist EAS

- [x] EAS CLI installé (`npm install -g eas-cli`)
- [x] Compte EAS créé
- [x] Connecté à EAS (`eas login`)
- [x] Project ID créé (`933f84d1-d77d-469a-828e-ac40383fed30`)
- [x] `eas.json` créé et valide
- [x] `app.json` mis à jour avec bundle IDs
- [ ] Variables d'environnement créées (`eas env:create`)
- [ ] Variables vérifiées (`eas env:list`)
- [ ] Premier build de test lancé

---

## 🎯 Prochaines étapes après EAS

Une fois la configuration EAS terminée :

1. **Build preview Android** (1h)
   ```bash
   eas build --profile preview --platform android
   ```

2. **Tester l'APK** sur un vrai device (1h)
   - Télécharger l'APK
   - Installer sur Android
   - Tester import PDF
   - Tester auth Supabase

3. **Créer les comptes stores** (si pas déjà fait)
   - Apple Developer (99$/an)
   - Google Play Console (25$ one-time)

4. **Préparer les assets**
   - Screenshots (6 par plateforme)
   - Feature graphic Android
   - Descriptions

5. **Build production**
   ```bash
   eas build --profile production --platform android
   eas build --profile production --platform ios
   ```

6. **Submit aux stores**
   ```bash
   eas submit --platform android --latest
   eas submit --platform ios --latest
   ```

---

## 📚 Commandes utiles

```bash
# Vérifier la config
eas config

# Lister les builds
eas build:list

# Lister les variables d'env
eas env:list

# Mettre à jour une variable
eas env:update --name VARIABLE_NAME --value NEW_VALUE

# Supprimer une variable
eas env:delete --name VARIABLE_NAME

# Voir les credentials
eas credentials

# Créer un build iOS
eas build --profile production --platform ios

# Créer un build Android
eas build --profile production --platform android

# Créer les deux en même temps
eas build --profile production --platform all
```

---

## 💡 Conseils

### Environnements EAS

- **development** : Pour tester avec Expo Go ou development builds
- **preview** : Pour tester des builds standalone (APK/IPA) avant production
- **production** : Pour les builds finaux destinés aux stores

### Visibilité des variables

- **plaintext** : Visible dans le dashboard EAS (pour vars publiques comme URLs)
- **secret** : Chiffrée, non visible (pour clés API privées)

⚠️ Les variables `EXPO_PUBLIC_*` doivent être en `plaintext` car elles sont injectées dans le JavaScript client.

### Bundle IDs

⚠️ **Important** : Une fois choisis et utilisés pour un premier build/submission, les bundle IDs **ne peuvent plus être changés** sans créer une nouvelle app sur les stores.

Format recommandé : `com.votreusername.nomapp`

---

## ✅ Validation finale

Avant de lancer votre premier build production, vérifiez :

```bash
# 1. Fichiers de config valides
cat eas.json
cat app.json

# 2. Variables d'environnement créées
eas env:list

# 3. Compte EAS actif
eas whoami

# 4. Projet configuré
eas config

# Si tout est OK, vous pouvez lancer :
eas build --profile preview --platform android
```

---

**Bravo ! La configuration EAS est presque terminée 🎉**

*Il ne reste plus qu'à créer les variables d'environnement et lancer un premier build de test !*

