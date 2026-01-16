# 🚀 Checklist Déploiement Production - MedFlash

## 📊 État actuel du projet (Mis à jour : 14 janvier 2026)

### ✅ Ce qui est déjà fait

#### Backend
- ✅ Backend Node.js/Express fonctionnel (port 3333)
- ✅ Migration SQLite complétée (storeSQLite.js utilisé)
- ✅ Extraction PDF (pdf-parse)
- ✅ Génération IA avec OpenAI (flashcards + MCQs)
- ✅ Rate limiting configuré (120 req/min)
- ✅ CORS et sécurité (helmet)
- ✅ Error handling robuste
- ✅ Base de données SQLite avec transactions ACID
- ✅ **Tunnel Cloudflare Named avec domaine stable : `https://medflash-api.tri-pacer.fr`**

#### Frontend (App Expo)
- ✅ App React Native avec Expo Router
- ✅ Navigation tab complète
- ✅ Authentification Supabase (login/signup) configurée
- ✅ Synchronisation cloud des données
- ✅ Système de révision espacée
- ✅ Import PDF et génération de decks
- ✅ Mode quiz avec MCQs
- ✅ Statistiques et historique
- ✅ Stockage local (AsyncStorage)
- ✅ UI/UX moderne et responsive
- ✅ Configuration .env avec URL backend stable
- ✅ **Privacy Policy créée et hébergée (GitHub Pages)**
- ✅ **Lien Privacy Policy ajouté dans Settings**
- ✅ **Système de monétisation RevenueCat intégré**
- ✅ **Paywall élégant créé**
- ✅ **Limitation à 5 decks gratuits implémentée**

#### Infrastructure
- ✅ Cloudflare Named Tunnel configuré (`medflash-api.tri-pacer.fr`)
- ✅ Supabase configuré (auth + storage)
- ✅ Configuration .env complète

---

## 🎯 Ce qu'il reste à faire avant le lancement

### 1. 🔐 Backend - Configuration Production

#### ✅ 1.1. Tunnel Cloudflare Stable - DÉJÀ FAIT !
**Statut**: ✅ **Complété**  
**URL actuelle**: `https://medflash-api.tri-pacer.fr`

Votre backend est déjà accessible via une URL stable. Plus rien à faire ici ! 🎉

---

#### 🟡 1.2. Décision : Backend Local vs Cloud
**Statut**: Backend tourne actuellement sur votre Mac via tunnel  
**Impact**: Critique - Disponibilité 24/7

**Situation actuelle** :
Votre backend fonctionne sur votre Mac avec un tunnel Cloudflare nommé, ce qui est **parfaitement viable** pour une MVP et les premiers utilisateurs.

**Options disponibles** :

##### Option A: **Garder le setup actuel** (0€/mois)
**Avantages** :
- ✅ Déjà fonctionnel
- ✅ 100% gratuit
- ✅ URL stable configurée
- ✅ Contrôle total
- ✅ Parfait pour MVP et tests utilisateurs

**Inconvénients** :
- ⚠️ Votre Mac doit rester allumé
- ⚠️ Pas de redondance
- ⚠️ Dépend de votre connexion internet

**Recommandé si** :
- Vous êtes en phase MVP/early adopters
- Vous avez moins de 100 utilisateurs actifs
- Votre Mac peut rester allumé la plupart du temps
- Vous voulez économiser pour l'instant

**À faire pour optimiser** :
```bash
# Configurer le tunnel en service système (auto-restart)
cloudflared service install

# Vérifier qu'il démarre au boot
sudo launchctl list | grep cloudflare
```

##### Option B: **Migrer vers Fly.io** (~0€/mois)
**Avantages** :
- ✅ Backend accessible 24/7 sans votre Mac
- ✅ Toujours gratuit (3 VMs free tier)
- ✅ Pas de cold start
- ✅ Meilleure résilience

**Inconvénients** :
- ⚠️ Migration nécessaire (~2h de setup)
- ⚠️ Complexité supplémentaire

**Recommandé si** :
- Vous allez lancer publiquement (>100 users)
- Vous ne voulez pas laisser votre Mac allumé
- Vous voulez une infrastructure professionnelle

**Guide de migration** : Voir `GUIDE-DEPLOIEMENT-RAPIDE.md` (Étape 1)

##### Option C: **Render.com** (0€/mois)
**À éviter** : Sleep après 15 min = mauvaise UX (cold start de 30s)

**💡 Recommandation** : 
- **Court terme (MVP)** : Gardez le setup actuel (Option A)
- **Moyen terme (scaling)** : Migrez vers Fly.io (Option B) quand vous avez >100 users réguliers

---

#### ✅ 1.3. Variables d'environnement backend
**Statut**: ✅ **Complété**  
**Impact**: Critique - Sécurité

Le fichier `backend/.env` contient maintenant :
```bash
# Dans backend/.env
OPENAI_API_KEY=sk-proj-... # ✅ Devrait déjà être là
PORT=3333
CORS_ORIGIN=* # Ou spécifier votre domaine
NODE_ENV=production # À ajouter pour la prod
```

**Créer un template** pour documentation :
```bash
cat > backend/.env.example << 'EOF'
# OpenAI API Key (obligatoire)
OPENAI_API_KEY=sk-proj-your-key-here

# Port du serveur
PORT=3333

# CORS Origins (dev: *, prod: votre-domaine.com)
CORS_ORIGIN=*

# Environment
NODE_ENV=production

# DB Path (optionnel, par défaut: ./data/medflash.db)
# DB_PATH=./data/medflash.db
EOF
```

---

#### ✅ 1.4. Backup automatique SQLite
**Statut**: ✅ **Complété**  
**Impact**: Élevé - Protection contre perte de données

**Ce qui a été fait** :

✅ **Fichier `backend/src/backup.js` créé** avec :
- Backup automatique quotidien en production
- Rotation automatique (garde les 7 derniers backups)
- Backup initial au démarrage du serveur

✅ **Intégré dans `backend/src/index.js`** :
- Import du module backup
- Activation automatique en mode production

✅ **Script de backup manuel** : `backend/scripts/backup-now.js`
```bash
# Faire un backup manuel
npm run backup
# ou
node scripts/backup-now.js
cat > backend/src/backup.js << 'EOF'
import { copyFileSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function backupDatabase() {
  const dbPath = process.env.DB_PATH || join(__dirname, '../data/medflash.db');
  const backupDir = join(__dirname, '../data/backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(backupDir, `medflash-${timestamp}.db`);
  
  try {
    // Créer le dossier backups s'il n'existe pas
    mkdirSync(backupDir, { recursive: true });
    
    // Copier la DB
    copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup créé: ${backupPath}`);
    
    // Cleanup: garder seulement les 7 derniers backups
    const backups = readdirSync(backupDir)
      .filter(f => f.startsWith('medflash-') && f.endsWith('.db'))
      .sort()
      .reverse();
    
    if (backups.length > 7) {
      backups.slice(7).forEach(file => {
        unlinkSync(join(backupDir, file));
        console.log(`🗑️ Supprimé ancien backup: ${file}`);
      });
    }
    
    return backupPath;
  } catch (error) {
    console.error('❌ Erreur backup:', error);
  }
}

// Backup quotidien
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    backupDatabase();
  }, 24 * 60 * 60 * 1000); // 24h
  
  // Backup initial au démarrage
  setTimeout(() => backupDatabase(), 5000);
}
EOF
```

**Intégrer dans le backend** :

```bash
# Modifier backend/src/index.js
# Ajouter en haut du fichier (après les imports)
```

```javascript
// backend/src/index.js
// ... autres imports
import { backupDatabase } from './backup.js';

// ... reste du code ...

// Après initStore(), ajouter :
(async () => {
  await initStore();
  
  // Backup automatique en production
  if (process.env.NODE_ENV === 'production') {
    backupDatabase(); // Backup initial
  }
  
  const port = Number(process.env.PORT ?? 3333);
  app.listen(port, "0.0.0.0", () => console.log(`Backend on http://0.0.0.0:${port}`));
})();
```

**Alternative plus simple** : Backup manuel quotidien via cron :
```bash
# Ajouter dans votre crontab (crontab -e)
0 3 * * * cp ~/Documents/medflash/backend/data/medflash.db ~/Documents/medflash/backend/data/backups/medflash-$(date +\%Y\%m\%d).db
```

---

#### 🟢 1.5. Logs et Monitoring
**Statut**: Logs basiques avec `console.log`  
**Impact**: Moyen

**Pour l'instant** : Les logs de votre terminal backend suffisent pour le MVP.

**Optionnel - Sentry pour crash tracking** :
```bash
cd backend
npm install @sentry/node

# Dans backend/src/index.js
import * as Sentry from "@sentry/node";

if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
  });
}
```

---

### 2. 📱 Build et Déploiement Mobile

#### ✅ 2.1. Configuration EAS (Expo Application Services)
**Statut**: ✅ **COMPLÉTÉ à 100%** 🎉  
**Impact**: **CRITIQUE** - Nécessaire pour publier sur les stores

**Ce qui a été fait** :

✅ EAS CLI installé
✅ Compte EAS créé et connecté
✅ Project ID créé : `933f84d1-d77d-469a-828e-ac40383fed30`
✅ `eas.json` créé et corrigé (format v7+)
✅ `app.json` mis à jour avec bundle IDs
✅ Plugins configurés
✅ **Variables d'environnement créées** :
  - 4 variables × 2 environnements (preview + production)
  - `EXPO_PUBLIC_API_BASE_URL` : `https://medflash-api.tri-pacer.fr`
  - `EXPO_PUBLIC_SUPABASE_URL` : `https://fcynbbggrholkmxpuftu.supabase.co`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` : Configurée ✅
  - `EXPO_PUBLIC_MOCK_API` : `false`

**Configuration EAS : 100% terminée !** 🚀

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
        "bundleIdentifier": "com.romaindurieux.medflash"
      },
      "android": {
        "buildType": "apk",
        "package": "com.romaindurieux.medflash"
      }
    },
    "production": {
      "channel": "production",
      "ios": {
        "bundleIdentifier": "com.romaindurieux.medflash"
      },
      "android": {
        "buildType": "aab",
        "package": "com.romaindurieux.medflash"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Configurer les variables d'environnement** (NOUVELLE COMMANDE EAS v7+) :

📝 **Guide complet** : `GUIDE-EAS-CONFIG.md`

**Option A : Via script (RECOMMANDÉ)**
```bash
cd /Users/romain.durieux/Documents/medflash
bash scripts/setup-eas-env.sh
```

**Option B : Manuellement**
```bash
# Pour chaque variable, créer pour production ET preview :

# 1. API Backend URL
eas env:create --name EXPO_PUBLIC_API_BASE_URL \
  --value https://medflash-api.tri-pacer.fr \
  --environment production --visibility plaintext

eas env:create --name EXPO_PUBLIC_API_BASE_URL \
  --value https://medflash-api.tri-pacer.fr \
  --environment preview --visibility plaintext

# 2. Supabase URL
eas env:create --name EXPO_PUBLIC_SUPABASE_URL \
  --value https://fcynbbggrholkmxpuftu.supabase.co \
  --environment production --visibility plaintext

# 3. Supabase Anon Key
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "eyJhbGciOi..." \
  --environment production --visibility plaintext

# 4. Mock API
eas env:create --name EXPO_PUBLIC_MOCK_API \
  --value false \
  --environment production --visibility plaintext

# (Répéter pour --environment preview)
```

**Vérifier** :
```bash
eas env:list
# Devrait afficher vos 4 variables pour production et preview
```

---

#### ✅ 2.2. Mettre à jour app.json pour production
**Statut**: ✅ **Complété**  
**Impact**: **CRITIQUE** - Bundle IDs et métadonnées des stores

**Ce qui a été fait** :

✅ Bundle IDs configurés :
  - iOS : `com.romaindurieux.medflash`
  - Android : `com.romaindurieux.medflash`

✅ Permissions iOS ajoutées (caméra, photos)
✅ Permissions Android ajoutées (stockage)
✅ Version et build numbers configurés
✅ Plugins manquants ajoutés (expo-document-picker, expo-secure-store)

**Fichier actuel** : `/Users/romain.durieux/Documents/medflash/app.json`

**Configuration actuelle** :

```json
{
  "expo": {
    "name": "MedFlash",
    "slug": "medflash",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "medflash",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.romaindurieux.medflash",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "MedFlash a besoin d'accéder à votre appareil photo pour scanner des documents.",
        "NSPhotoLibraryUsageDescription": "MedFlash a besoin d'accéder à vos photos pour importer des documents."
      }
    },
    "android": {
      "package": "com.romaindurieux.medflash",
      "versionCode": 1,
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ],
      "expo-font",
      "expo-document-picker",
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID_WILL_BE_ADDED_BY_EAS"
      }
    }
  }
}
```

**Note** : Le `projectId` sera automatiquement ajouté quand vous exécuterez `eas build:configure`.

---

#### ✅ 2.3. Privacy Policy
**Statut**: ✅ **FAIT** - Créée et hébergée sur GitHub Pages  
**Impact**: **CRITIQUE** - **Requis par Apple et Google pour publication**
**URL**: https://romaind-prog.github.io/clinicard/privacy-policy.html

**Ce qui a été fait** :
1. ✅ Privacy Policy générée via Termly
2. ✅ Hébergée sur GitHub Pages : https://romaind-prog.github.io/clinicard/
3. ✅ Lien ajouté dans Settings de l'app
4. ✅ Prête pour soumission App Store / Play Store

---

##### Étape 1 : Générer la politique (15 min) ✅ FAIT

Utiliser [termly.io](https://termly.io/products/privacy-policy-generator/) (gratuit) :

**Informations à renseigner** :
- **Nom de l'app** : MedFlash
- **Type** : Application mobile (iOS + Android)
- **Données collectées** :
  - ✅ Adresse email (authentification)
  - ✅ Contenu utilisateur (flashcards, progrès de révision)
  - ✅ Fichiers uploadés (PDFs)
  - ✅ Données d'usage (analytics - optionnel)
- **Services tiers utilisés** :
  - OpenAI (traitement des PDFs)
  - Supabase (stockage cloud et authentification)
- **Région** : Europe (RGPD applicable)
- **Cookies** : Non (app mobile)

##### Étape 2 : Héberger (choisir une option) ✅ FAIT

**✅ Option choisie : GitHub Pages**

Document hébergé sur : https://romaind-prog.github.io/clinicard/privacy-policy.html

**Option A : Notion** (5 min - PLUS RAPIDE) :
1. Créer une page Notion
2. Coller votre Privacy Policy
3. Cliquer sur "Share" → "Publish to web"
4. Copier l'URL publique

**Option B : GitHub Pages** (15 min) - ✅ UTILISÉE :
```bash
cd /Users/romain.durieux/Documents/medflash

# Créer le dossier docs
mkdir -p docs

# Créer la page HTML
cat > docs/privacy-policy.html << 'EOF'
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MedFlash - Politique de Confidentialité</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #0066cc; }
        h2 { color: #333; margin-top: 2em; }
    </style>
</head>
<body>
    <h1>Politique de Confidentialité - MedFlash</h1>
    <p><em>Dernière mise à jour : 11 janvier 2026</em></p>
    
    <!-- COLLER VOTRE CONTENU GÉNÉRÉ ICI -->
    
</body>
</html>
EOF

# Commit et push
git add docs/
git commit -m "Add privacy policy"
git push
```

Puis sur GitHub :
- Settings → Pages → Source: `main` branch, `/docs` folder
- URL sera : `https://RomainD-prog.github.io/medflash/privacy-policy.html`

**Option C : Votre propre site** (si vous en avez un)

##### Étape 3 : Intégration dans l'app ✅

**✅ FAIT** : Lien ajouté dans `app/(tabs)/settings.tsx` dans la section "LÉGAL"
- Bouton "Politique de confidentialité" qui ouvre le lien dans le navigateur
- Utilise `Linking.openURL()` pour ouvrir l'URL GitHub Pages

**Note pour les formulaires Apple/Google** : Utiliser cette URL lors de la soumission :
```
https://romaind-prog.github.io/clinicard/privacy-policy.html
```

---

#### 🟡 2.4. Terms of Service (Optionnel mais recommandé)
**Statut**: ⏸️ Non créés (peut être ajouté plus tard)  
**Impact**: Moyen - Protection légale supplémentaire
**Note** : La Privacy Policy seule suffit pour la publication initiale.

Si besoin plus tard : Utiliser le même processus que la Privacy Policy avec [termly.io](https://termly.io/) ou un template.

---

#### 🟡 2.5. Comptes Développeurs Stores

##### Apple Developer
**Statut**: À créer  
**Coût**: 99$/an (~93€)  
**Lien**: [developer.apple.com](https://developer.apple.com/)

**Actions** :
1. Créer un compte Apple Developer
2. Payer 99$/an
3. Attendre validation (24-48h généralement)

**Note** : Vous pouvez commencer les builds Android pendant l'attente.

##### Google Play Console
**Statut**: À créer  
**Coût**: 25$ one-time (~23€)  
**Lien**: [play.google.com/console](https://play.google.com/console/)

**Actions** :
1. Créer un compte Google Play Developer
2. Payer 25$ (unique)
3. Créer une nouvelle app :
   - Nom : MedFlash
   - Langue par défaut : Français
   - Type : Application
   - Gratuit

---

#### 🟡 2.6. Préparer les Assets pour les Stores

**Statut**: Guides créés, screenshots à prendre  
**Impact**: **CRITIQUE** - Requis pour publication

**✅ Guides créés** :
- `GUIDE-ASSETS-STORES.md` : Guide complet avec dimensions et méthodes
- `GUIDE-SCREENSHOTS-RAPIDE.md` : Guide express pour prendre les screenshots (30 min)
- `STORE-DESCRIPTIONS-COPY-PASTE.md` : Tous les textes prêts à copier-coller

##### Assets déjà prêts ✅
- Icon principal (1024x1024) : `icon.png`
- Splash screen : `splash-icon.png`
- Android adaptive icons (foreground, background, monochrome)

##### Assets à créer 📸

**Screenshots iOS** (obligatoire) :
- iPhone 6.7" (1290 x 2796) : 5 screenshots recommandés
- iPhone 5.5" (1242 x 2208) : 5 screenshots recommandés

**Screenshots Android** (obligatoire) :
- Phone (1080 x 1920 minimum) : 5 screenshots recommandés

**Feature Graphic Android** (obligatoire) :
- 1024 x 500 px

**Comment les créer** :
👉 **Voir `GUIDE-SCREENSHOTS-RAPIDE.md` pour la méthode express (30 min)**

**Méthode rapide** :
1. Prendre 5 screenshots dans l'app (Library, Import, Flashcard, Quiz, Stats)
2. Utiliser [Shotsnapp](https://shotsnapp.com/) pour ajouter device frames (gratuit)
3. Créer Feature Graphic avec Canva (5 min)

**Screens à capturer** (dans l'ordre) :
1. Écran Library (liste des cours)
2. Import d'un PDF
3. Vue d'une flashcard (révision)
4. Quiz en action
5. Statistiques

---

#### 🟡 2.7. Descriptions pour les Stores
**Statut**: ✅ **Prêtes** - Voir `GUIDE-ASSETS-STORES.md`  
**Impact**: Important - Améliore le taux de conversion

**✅ Guide complet créé** : Voir `GUIDE-ASSETS-STORES.md` pour toutes les descriptions prêtes à copier-coller.

**Résumé rapide** :

##### Titre iOS (30 caractères max)
```
CliniCard - Flashcards IA
```

##### Subtitle iOS (30 caractères max)
```
Révisions médicales IA
```

##### Titre Android (50 caractères max)
```
CliniCard - Flashcards Médicales IA
```

##### Short Description Android (80 caractères)
```
Transformez vos cours en flashcards IA. Pour PASS, LAS, PACES. Révisions optimisées.
```

##### Description complète
Voir `GUIDE-ASSETS-STORES.md` pour la description complète (~1800 caractères) avec toutes les fonctionnalités, avantages, et call-to-action.

##### Keywords iOS (100 caractères)
```
médecine,flashcards,IA,révision,PASS,LAS,PACES,QCM,étudiant,mémorisation
```

##### Catégories
- iOS : Education
- Android : Education

---

### 3. 🧪 Testing avant Publication

#### 🟡 3.1. Build Preview (Test interne)

**À faire AVANT de soumettre aux stores** :

```bash
cd /Users/romain.durieux/Documents/medflash

# Build Android APK pour tests
eas build --platform android --profile preview

# Attendre 10-15 min, puis télécharger et installer sur un téléphone Android
```

**Tests à effectuer** :
- [ ] L'app se lance sans crash
- [ ] Import d'un PDF fonctionne
- [ ] Génération de flashcards fonctionne (avec backend tri-pacer.fr)
- [ ] Authentification Supabase fonctionne
- [ ] Révision de cartes fonctionne
- [ ] Statistiques s'affichent
- [ ] Sync cloud fonctionne
- [ ] Pas de bugs majeurs

**Inviter 5-10 beta testers** pour avoir des retours avant le lancement public.

---

### 4. 📄 Légal et Compliance

#### 🔴 4.1. Privacy Policy - DÉJÀ COUVERT (voir section 2.3)

#### ✅ 4.2. RGPD - Suppression de compte

**Statut**: ✅ **IMPLÉMENTÉ** - Conforme RGPD  
**Impact**: Important - Droit à l'effacement (Article 17 RGPD)

**Ce qui a été fait** :

✅ **Fonction `deleteAccount()` implémentée** dans `src/services/authService.ts` :
- Supprime toutes les données utilisateur dans Supabase (table `user_data`)
- Supprime toutes les données locales (decks, révisions, stats, etc.)
- Supprime l'ID utilisateur authentifié
- Déconnecte l'utilisateur
- Gestion d'erreurs complète

✅ **Bouton "Supprimer mon compte" ajouté** dans `app/(tabs)/settings.tsx` :
- Visible uniquement pour les utilisateurs connectés
- Double confirmation avec Alert explicite
- Message clair sur l'irréversibilité de l'action
- Redirection automatique après suppression

**Conformité RGPD** :
- ✅ Droit à l'effacement (Article 17) : L'utilisateur peut supprimer son compte et toutes ses données
- ✅ Suppression complète des données cloud et locales
- ✅ Action irréversible avec confirmation explicite

---

**Code de référence** (déjà implémenté) :

Dans `src/services/authService.ts` :

```typescript
export async function deleteAccount() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Non authentifié');
  
  try {
    // 1. Supprimer les données Supabase
    const { error } = await supabase
      .from('user_data')
      .delete()
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    // 2. Supprimer les données locales
    await AsyncStorage.clear();
    
    // 3. Déconnexion
    await supabase.auth.signOut();
    
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression compte:', error);
    throw error;
  }
}
```

Puis ajouter un bouton dans `app/(tabs)/settings.tsx` :

```typescript
<TouchableOpacity 
  onPress={async () => {
    Alert.alert(
      'Supprimer le compte',
      'Êtes-vous sûr ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
            // Rediriger vers login
          },
        },
      ]
    );
  }}
>
  <Text style={{ color: 'red' }}>Supprimer mon compte</Text>
</TouchableOpacity>
```

---

## 📋 Résumé : Ce qu'il faut faire maintenant

### 🔴 PRIORITÉ CRITIQUE (Bloquant - à faire cette semaine)

1. 🧪 **Premier build de test** (1h) - **PROCHAINE ÉTAPE**
   ```bash
   eas build --profile preview --platform android
   ```
   - Télécharger et installer l'APK
   - Tester sur device réel
   - Vérifier que tout fonctionne

2. **Créer et publier Privacy Policy** (1h)
   - Générer sur termly.io
   - Héberger (Notion ou GitHub Pages)
   - Ajouter URL dans app.json

4. **Créer comptes stores** (1h + attente validation)
   - Apple Developer Account (99$/an)
   - Google Play Console (25$ one-time)

5. **Préparer screenshots** (2-3h)
   - 6 screenshots minimum par plateforme
   - Feature graphic Android

6. **Build preview et tests** (1 journée)
   - Build APK de test
   - Tester sur vrais devices
   - Corriger bugs critiques

### 🟡 PRIORITÉ ÉLEVÉE (Cette semaine/semaine prochaine)

7. **Écrire descriptions stores** (1h)
8. **Setup backup automatique DB** (30 min)
9. **Implémenter suppression compte** (1h - RGPD)
10. **Build de production** (2h)
11. **Submit aux stores** (1h)

### 🟢 PRIORITÉ MOYENNE (Post-submission)

12. **Monitoring/Analytics** (optionnel)
13. **Landing page** (optionnel)
14. **Marketing assets** (optionnel)

---

## ⏱️ Timeline Réaliste

**Si vous vous y mettez à fond** :

- **Jour 1-2** : Privacy Policy + EAS + app.json + screenshots (4-6h travail)
- **Jour 3** : Créer comptes stores (1h + attente validation)
- **Jour 4-5** : Build preview + tests + corrections bugs (4-6h)
- **Jour 6** : Build production + descriptions stores (2-3h)
- **Jour 7** : Submit aux stores

**Attente review** :
- Google Play : 1-3 jours
- App Store : 1-2 jours (parfois 24h)

**Total : ~2 semaines** pour être sur les stores 🎉

---

## 💰 Coûts à prévoir

| Item | Coût | Quand |
|------|------|-------|
| Apple Developer | ~93€ | Avant build iOS |
| Google Play | ~23€ | Avant submit Android |
| Backend (actuel) | 0€ | Inclus (tunnel local) |
| Supabase | 0€ | Free tier |
| OpenAI API | ~0.10€/deck | À l'usage |
| **TOTAL première année** | **~116€ + usage** | |

---

## 🎯 Checklist Complète

### Backend
- [x] Backend fonctionnel avec SQLite
- [x] Tunnel Cloudflare stable configuré (`medflash-api.tri-pacer.fr`)
- [x] URL stable configurée dans .env
- [x] Variables d'environnement configurées (`backend/.env`)
- [x] `.env.example` créé pour documentation
- [x] Backup automatique DB configuré
- [x] Script de backup manuel (`npm run backup`)
- [x] `.gitignore` backend configuré
- [x] README backend créé
- [ ] Logs monitoring (suffisant pour MVP)

### App Mobile
- [x] Privacy Policy créée et publiée
- [x] EAS configuré (eas.json) ✅
- [x] app.json mis à jour (bundle IDs, permissions) ✅
- [x] Variables d'env EAS créées (preview + production) ✅
- [ ] Premier build de test (PROCHAINE ÉTAPE)
- [ ] Screenshots préparés (iOS + Android)
- [ ] Descriptions stores écrites
- [ ] Feature graphic Android créé

### Comptes
- [x] Apple Developer Account créé et payé
- [x ] Google Play Console créé et payé

### Builds & Tests
- [ ] Build preview Android testé
- [ ] Build preview iOS testé (après validation Apple Developer)
- [ ] Beta testers invités (5-10 personnes)
- [ ] Bugs critiques corrigés

### Publication
- [ ] Build production Android (AAB)
- [ ] Build production iOS (IPA)
- [ ] Submit Google Play
- [ ] Submit App Store
- [ ] Attente validation
- [ ] **🎊 PUBLIÉ !**

---

## 📞 Besoin d'aide ?

**Documentation** :
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [App Store Connect Guide](https://developer.apple.com/help/app-store-connect/)
- [Google Play Console Guide](https://support.google.com/googleplay/android-developer)

**Support** :
- [Expo Discord](https://chat.expo.dev/)
- [r/reactnative](https://reddit.com/r/reactnative)

---

Votre setup backend est déjà solide ! Il ne reste plus que la partie mobile/stores à finaliser 💪

*Mis à jour : 11 janvier 2026*
