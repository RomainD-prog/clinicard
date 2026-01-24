# 🚀 Guide de Déploiement Rapide - MedFlash

Ce guide vous accompagne pas à pas pour déployer MedFlash en production.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :
- [ ] Un compte GitHub avec votre code poussé
- [ ] Node.js 20+ et npm installés
- [ ] Git configuré
- [ ] 2-3 heures devant vous

---

## 🎯 Parcours recommandé (option la plus simple)

### Étape 1: Déployer le Backend sur Fly.io (30 min)

**Pourquoi Fly.io ?**
- ✅ 100% gratuit pour 3 machines
- ✅ Pas de sleep (contrairement à Render)
- ✅ Déploiement en 5 minutes
- ✅ URL stable HTTPS automatique

#### 1.1. Installer Fly CLI

```bash
# Sur macOS
brew install flyctl

# Vérifier l'installation
flyctl version
```

#### 1.2. Créer un compte et se connecter

```bash
flyctl auth login
```

Cela va ouvrir un navigateur pour créer votre compte (gratuit).

#### 1.3. Créer le fichier de configuration Fly

```bash
cd backend

# Créer fly.toml
cat > fly.toml << 'EOF'
app = "medflash-backend"
primary_region = "cdg"

[build]
  [build.args]
    NODE_VERSION = "20"

[env]
  PORT = "8080"
  NODE_ENV = "production"
  CORS_ORIGIN = "*"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512

[mounts]
  source = "medflash_data"
  destination = "/data"
  initial_size = "1gb"
EOF
```

#### 1.4. Créer un Dockerfile

```bash
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer dépendances
RUN npm ci --production

# Copier le code source
COPY src ./src

# Créer le dossier data
RUN mkdir -p /data

# Exposer le port
EXPOSE 8080

# Démarrer l'app
CMD ["npm", "start"]
EOF
```

#### 1.5. Créer un .dockerignore

```bash
cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.env
.env.*
data/*.db
data/*.json
*.md
EOF
```

#### 1.6. Mettre à jour le backend pour utiliser le volume Fly

Modifier `backend/src/storeSQLite.js` :

```javascript
// Ligne 19, remplacer:
const dbPath = process.env.DB_PATH || join(dataDir, "medflash.db");

// Par:
const dbPath = process.env.DB_PATH || (process.env.NODE_ENV === 'production' 
  ? '/data/medflash.db' 
  : join(dataDir, "medflash.db"));
```

#### 1.7. Lancer l'app Fly

```bash
# Initialiser (choisir un nom unique si "medflash-backend" est pris)
flyctl launch --no-deploy

# Répondre aux questions:
# - Would you like to copy its configuration to the new app? Yes
# - Would you like to set up a PostgreSQL database? No
# - Would you like to set up an Upstash Redis database? No
```

#### 1.8. Créer le volume pour la DB

```bash
# Créer un volume persistant de 1GB
flyctl volumes create medflash_data --region cdg --size 1
```

#### 1.9. Configurer les secrets

```bash
# Ajouter votre clé OpenAI (remplacer par votre vraie clé)
flyctl secrets set OPENAI_API_KEY=sk-proj-your-key-here
```

#### 1.10. Déployer !

```bash
flyctl deploy
```

**Attendez 2-3 minutes** pendant que Fly build et déploie votre backend.

#### 1.11. Tester le backend

```bash
# Récupérer l'URL de votre backend
flyctl info

# Exemple: https://medflash-backend.fly.dev

# Tester
curl https://medflash-backend.fly.dev/health
# Devrait retourner: {"ok":true,"uptime":...}
```

✅ **Votre backend est maintenant en ligne 24/7 !**

---

### Étape 2: Configurer l'app mobile (10 min)

#### 2.1. Mettre à jour la configuration

Créer/modifier le fichier `.env` à la racine du projet :

```bash
cd ..  # Retour à la racine

cat > .env << 'EOF'
# Backend URL (remplacer par votre vraie URL Fly.io)
EXPO_PUBLIC_API_BASE_URL=https://medflash-backend.fly.dev

# Supabase (remplacer par vos vraies credentials)
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Mode
EXPO_PUBLIC_MOCK_API=false
EOF
```

⚠️ **Important** : Remplacez les valeurs par vos vraies credentials !

#### 2.2. Tester en local

```bash
# Nettoyer le cache
npx expo start -c

# Ouvrir l'app sur votre téléphone avec Expo Go
# Scanner le QR code

# Tester un import PDF
# ✅ Devrait utiliser le backend Fly.io
```

---

### Étape 3: Créer une Privacy Policy (30 min)

**Obligatoire pour publier sur les stores !**

#### 3.1. Générer la politique

Utiliser un générateur gratuit :
- [termly.io](https://termly.io/products/privacy-policy-generator/) (recommandé)
- [privacypolicygenerator.info](https://www.privacypolicygenerator.info/)

**Informations à fournir** :
- Nom de l'app : MedFlash
- Type : Application mobile (iOS + Android)
- Données collectées :
  - Email (pour l'authentification)
  - Contenu utilisateur (decks, flashcards, progrès)
  - Analytics anonymes (optionnel)
- Services tiers :
  - OpenAI (traitement de texte)
  - Supabase (stockage cloud)
- Région : Europe (si RGPD applicable)

#### 3.2. Héberger la politique

**Option A : GitHub Pages (gratuit)**

```bash
# Créer un dossier docs/
mkdir docs

# Copier votre privacy policy
nano docs/privacy-policy.html
# Coller le contenu généré

# Pusher sur GitHub
git add docs/
git commit -m "Add privacy policy"
git push

# Activer GitHub Pages:
# GitHub > Settings > Pages > Source: main branch /docs folder
```

Votre URL sera : `https://votre-username.github.io/medflash/privacy-policy.html`

**Option B : Notion (plus rapide)**

1. Créer une page Notion
2. Coller votre privacy policy
3. Cliquer sur "Share" → "Publish to web"
4. Copier l'URL publique

#### 3.3. Ajouter l'URL à votre app

Mettre à jour `app.json` :

```json
{
  "expo": {
    "ios": {
      "config": {
        "privacyManifests": {
          "NSPrivacyAccessedAPITypes": []
        }
      }
    },
    "extra": {
      "privacyPolicyUrl": "https://your-website.com/privacy-policy"
    }
  }
}
```

---

### Étape 4: Configurer EAS Build (30 min)

#### 4.1. Installer EAS CLI

```bash
npm install -g eas-cli

# Se connecter (créer un compte si nécessaire)
eas login
```

#### 4.2. Configurer le projet

```bash
# À la racine du projet
eas build:configure

# Cela va :
# 1. Créer eas.json
# 2. Vous demander de créer/choisir un projet Expo
# 3. Ajouter l'ID du projet dans app.json
```

#### 4.3. Modifier eas.json

Remplacer le contenu de `eas.json` :

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
        "simulator": false,
        "bundleIdentifier": "com.votreusername.medflash"
      },
      "android": {
        "buildType": "apk",
        "package": "com.votreusername.medflash"
      }
    },
    "production": {
      "channel": "production",
      "ios": {
        "bundleIdentifier": "com.votreusername.medflash"
      },
      "android": {
        "buildType": "aab",
        "package": "com.votreusername.medflash"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

⚠️ **Important** : Remplacez `votreusername` par votre identifiant unique !

#### 4.4. Mettre à jour app.json

Ajouter les bundle identifiers :

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.votreusername.medflash",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.votreusername.medflash",
      "versionCode": 1
    }
  }
}
```

#### 4.5. Configurer les secrets EAS

```bash
# Ajouter vos variables d'env pour les builds
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://medflash-backend.fly.dev
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project.supabase.co
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJxxx...
```

---

### Étape 5: Build de test (Preview) (20 min)

Avant de publier sur les stores, tester avec des builds internes.

#### 5.1. Build Android (APK)

```bash
# Build un APK pour tester
eas build --platform android --profile preview

# Attendre 10-15 minutes
# À la fin, vous aurez un lien pour télécharger l'APK
```

**Tester** :
- Installer l'APK sur un téléphone Android
- Tester l'import PDF
- Vérifier que ça utilise le backend Fly.io
- Tester l'authentification Supabase

#### 5.2. Build iOS (TestFlight)

```bash
# Build pour iOS (nécessite un compte Apple Developer)
eas build --platform ios --profile preview

# Si vous n'avez pas encore de compte Developer:
# Cela va vous guider pour créer les certificates
```

---

### Étape 6: Préparer les comptes stores (1 heure)

#### 6.1. Apple Developer (iOS)

1. Aller sur [developer.apple.com](https://developer.apple.com/)
2. S'inscrire au programme (99$/an)
3. Attendre validation (24-48h en général)
4. Une fois validé, retourner faire le build iOS

#### 6.2. Google Play Console (Android)

1. Aller sur [play.google.com/console](https://play.google.com/console/)
2. Créer un compte développeur (25$ one-time)
3. Créer une nouvelle app :
   - Nom : MedFlash
   - Langue : Français
   - Type : App
   - Gratuit ou payant : Gratuit
4. Remplir le questionnaire de contenu

---

### Étape 7: Build de production (30 min)

Une fois les tests passés avec les builds preview :

#### 7.1. Build Android Production

```bash
# Build AAB pour le Play Store
eas build --platform android --profile production

# Attendre 10-15 minutes
```

#### 7.2. Build iOS Production

```bash
# Build pour l'App Store
eas build --platform ios --profile production

# Attendre 15-20 minutes
```

---

### Étape 8: Submit aux stores (1 heure)

#### 8.1. Submit Android

```bash
# Submit automatique (si vous avez configuré le service account)
eas submit --platform android --latest

# Ou manuellement:
# 1. Télécharger le .aab depuis le dashboard EAS
# 2. Aller sur Play Console > Release > Production
# 3. Upload le .aab
# 4. Remplir les infos (description, screenshots, etc.)
# 5. Soumettre pour review
```

**Review Google** : 1-3 jours en général

#### 8.2. Submit iOS

```bash
# Submit automatique à TestFlight
eas submit --platform ios --latest

# Ensuite dans App Store Connect:
# 1. Aller sur App Store Connect
# 2. Créer l'app si pas déjà fait
# 3. Remplir toutes les infos (description, screenshots, etc.)
# 4. Sélectionner le build depuis TestFlight
# 5. Soumettre pour review
```

**Review Apple** : 1-2 jours en général (parfois 24h)

---

## 📸 Assets requis pour les stores

Avant de soumettre, préparer :

### Screenshots

**iOS** (obligatoire) :
- iPhone 6.5" (1284 x 2778) : 3-10 screenshots
- iPhone 5.5" (1242 x 2208) : 3-10 screenshots

**Android** (obligatoire) :
- Phone : 1080 x 1920 minimum, 2-8 screenshots
- 7" Tablet : optionnel
- 10" Tablet : optionnel

### Feature Graphic (Android uniquement)

- 1024 x 500 px
- Format JPG ou PNG

**Astuce** : Utiliser Figma + un plugin comme "Mockup" pour créer des screenshots professionnels rapidement.

---

## 🎉 Lancement !

Une fois approuvé par les stores :

### Checklist finale

- [ ] Backend Fly.io accessible et testé
- [ ] Privacy Policy publiée
- [ ] Apps approuvées par Apple et Google
- [ ] Screenshots à jour
- [ ] Descriptions traduits (FR + EN)
- [ ] Support email configuré (ex: support@medflash.app)
- [ ] Monitoring actif (Fly.io dashboard)

### Publication

**Android** :
1. Play Console > Release > Production
2. Cliquer sur "Release to Production"
3. L'app est live en 2-3 heures

**iOS** :
1. App Store Connect > App Store
2. Sélectionner le build approuvé
3. Cliquer sur "Submit for Review"
4. Une fois approuvé, cliquer sur "Release this version"
5. L'app est live en 24h

---

## 🚨 Troubleshooting

### Le backend Fly.io ne démarre pas

```bash
# Voir les logs
flyctl logs

# Vérifier la config
flyctl status

# Redéployer
flyctl deploy --force
```

### Build EAS échoue

```bash
# Voir les logs détaillés
eas build:list
# Cliquer sur le build pour voir les logs

# Problèmes courants:
# - Dependencies manquantes: vérifier package.json
# - Bundle ID déjà pris: changer dans app.json
# - Certificates expirés: eas credentials
```

### Store rejection

**Raisons courantes** :
- Privacy Policy manquante ou non accessible
- Crash au lancement
- Contenu inapproprié
- Permissions non justifiées

**Solution** : Lire le feedback du reviewer et corriger, puis re-submit.

---

## 📊 Après le lancement

### Monitoring

```bash
# Logs backend
flyctl logs --app medflash-backend

# Métriques
flyctl dashboard
```

### Analytics

Ajouter Sentry ou Google Analytics pour tracker :
- Nombre de downloads
- Taux de rétention
- Crashes
- Features les plus utilisées

### Itération

1. Collecter feedback users (reviews + emails)
2. Prioriser les bugs et features
3. Itérer rapidement
4. Publier des updates régulières (tous les 2-3 semaines)

---

## 💰 Coûts récapitulatifs

| Service | Coût | Fréquence |
|---------|------|-----------|
| Fly.io backend | **0€** | Gratuit forever |
| Supabase | **0€** | Gratuit (500MB) |
| OpenAI API | ~0.10€/deck | À l'usage |
| Apple Developer | 99$ (~93€) | Par an |
| Google Play | 25$ (~23€) | One-time |
| **TOTAL première année** | **~116€** + usage OpenAI | |
| **TOTAL années suivantes** | **93€/an** + usage OpenAI | |

---

## 🎯 Checklist complète

### Backend
- [ ] Fly.io configuré et déployé
- [ ] Volume créé pour SQLite
- [ ] Secrets configurés (OPENAI_API_KEY)
- [ ] Backend accessible et testé
- [ ] Health check répond

### App
- [ ] .env configuré avec l'URL Fly.io
- [ ] Supabase credentials ajoutés
- [ ] app.json complété (bundle IDs)
- [ ] eas.json créé
- [ ] Secrets EAS configurés
- [ ] Tests en local OK

### Légal
- [ ] Privacy Policy créée
- [ ] Privacy Policy publiée
- [ ] URL ajoutée à app.json
- [ ] Terms of Service créés (optionnel)

### Stores
- [ ] Compte Apple Developer créé
- [ ] Compte Google Play créé
- [ ] Screenshots préparés
- [ ] Descriptions écrites
- [ ] Feature graphic créé (Android)

### Builds
- [ ] Build preview Android testé
- [ ] Build preview iOS testé
- [ ] Build production Android créé
- [ ] Build production iOS créé
- [ ] AAB uploadé sur Play Console
- [ ] IPA uploadé sur App Store Connect

### Lancement
- [ ] App soumise pour review (Android)
- [ ] App soumise pour review (iOS)
- [ ] Reviews approuvées
- [ ] Apps publiées
- [ ] 🎊 **CÉLÉBRER !**

---

Bon lancement ! 🚀

*Besoin d'aide ? Contacte la communauté Expo sur [Discord](https://chat.expo.dev/)*

