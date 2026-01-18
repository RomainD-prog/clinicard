# 🚀 Backend Production - Guide Complet

Ce guide résume tout le setup backend pour MedFlash, du tunnel Cloudflare à SQLite.

---

## ✅ Ce qui est fait

### 1. Backend Node.js
- ✅ Express + CORS + Rate limiting
- ✅ Upload PDF (15 MB max)
- ✅ Extraction de texte (pdf-parse)
- ✅ Génération OpenAI (flashcards + MCQs)
- ✅ Stockage JSON (decks + jobs)
- ✅ Écoute sur port 3333

### 2. Tunnel Cloudflare
- ✅ Quick Tunnel fonctionnel
- ✅ URL HTTPS publique
- ✅ Accessible depuis iOS/Android

### 3. App Expo
- ✅ `.env` configuré avec l'URL du tunnel
- ✅ Mode cloud activé (MOCK_API=false)
- ✅ Prêt à tester les imports

---

## 🎯 État actuel

Tu as **3 terminaux ouverts** :

```
Terminal 1 : Backend
cd backend && npm run dev
→ Backend on http://0.0.0.0:3333

Terminal 2 : Cloudflare Tunnel
cloudflared tunnel --url http://127.0.0.1:3333
→ https://lopez-runs-mysql-rehab.trycloudflare.com

Terminal 3 : Expo
npx expo start -c
→ Metro bundler + app mobile
```

---

## 📋 Prochaines étapes

### Étape 1 : Tester l'import (maintenant)

1. Ouvre l'app sur ton téléphone/simulateur
2. Va dans "Import"
3. Upload un PDF
4. Vérifie que la génération fonctionne ✅

### Étape 2 : Named Tunnel (URL stable)

**Problème** : Le Quick Tunnel change d'URL à chaque redémarrage

**Solution** : Named Tunnel avec URL fixe

```bash
# Lancer le script interactif
bash scripts/setup-named-tunnel.sh
```

Ce script va :
1. Te connecter à Cloudflare
2. Créer un tunnel nommé "medflash"
3. Configurer une URL stable
4. Mettre à jour ton .env automatiquement

**Avantages** :
- ✅ URL ne change jamais
- ✅ Redémarre automatiquement (optionnel)
- ✅ Toujours gratuit

### Étape 3 : Migration SQLite (optionnel mais recommandé)

**Problème** : Le stockage JSON n'est pas robuste pour la production

**Solution** : SQLite (toujours gratuit, plus performant)

```bash
# Suivre le guide
cat scripts/MIGRATION-SQLITE.md
```

**Avantages** :
- ✅ Plus rapide
- ✅ Transactions ACID
- ✅ Concurrent access safe
- ✅ Toujours gratuit
- ✅ Pas de serveur externe

**Impact** : ~30 minutes de dev, API reste identique

### Étape 4 : Déploiement (optionnel)

Pour l'instant, le backend tourne sur ton Mac. Pour une vraie prod :

#### Option A : Render.com (gratuit)
- ✅ 750h/mois gratuit
- ✅ Deploy depuis Git
- ✅ HTTPS automatique
- ⚠️ Sleep après 15 min d'inactivité

```bash
# Créer render.yaml
cat > render.yaml << EOF
services:
  - type: web
    name: medflash-backend
    env: node
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: PORT
        value: 10000
      - key: OPENAI_API_KEY
        sync: false
EOF
```

#### Option B : Fly.io (gratuit)
- ✅ 3 VMs gratuits
- ✅ Pas de sleep
- ✅ Global CDN

```bash
# Installer Fly CLI
brew install flyctl

# Se connecter
flyctl auth login

# Déployer
flyctl launch
```

#### Option C : Garder sur ton Mac (gratuit)
- ✅ Named Tunnel avec autostart
- ✅ Ton Mac devient le serveur
- ⚠️ Doit rester allumé

---

## 🗂️ Structure actuelle

```
medflash/
├── backend/
│   ├── data/
│   │   ├── decks.json        # Stockage des decks (bientôt SQLite)
│   │   └── jobs.json         # Stockage des jobs
│   ├── src/
│   │   ├── extract.js        # Extraction PDF
│   │   ├── generate.js       # Génération OpenAI
│   │   ├── index.js          # API Express
│   │   └── store.js          # Stockage JSON (bientôt SQLite)
│   ├── package.json
│   └── .env                  # OPENAI_API_KEY
│
├── app/                      # App Expo/React Native
│   ├── auth/                 # Écrans auth Supabase
│   ├── (tabs)/               # Navigation
│   └── ...
│
├── src/
│   ├── services/
│   │   ├── authService.ts    # Auth Supabase
│   │   ├── cloudSync.ts      # Sync cloud
│   │   └── backendApi.ts     # Calls au backend
│   └── ...
│
├── scripts/
│   ├── setup-supabase.md           # ✅ Guide Supabase (fait)
│   ├── supabase-schema.sql         # ✅ Schema SQL (fait)
│   ├── update-api-url.sh           # ✅ Script MAJ .env (fait)
│   ├── setup-named-tunnel.sh       # 🔄 Script Named Tunnel
│   ├── MIGRATION-SQLITE.md         # 🔄 Guide SQLite
│   └── BACKEND-PRODUCTION.md       # 📖 Ce fichier
│
├── .env                      # Config (Supabase + API URL)
├── .env.backup               # Backup auto
└── .env.example              # Template
```

---

## 🔄 Workflow de développement

### Mode Dev (actuel)

```bash
# Terminal 1 : Backend
cd backend
npm run dev

# Terminal 2 : Tunnel
cloudflared tunnel --url http://127.0.0.1:3333

# Terminal 3 : Expo
npx expo start
```

### Après Named Tunnel

```bash
# Terminal 1 : Backend
cd backend
npm run dev

# Terminal 2 : Tunnel (avec config)
cloudflared tunnel run medflash

# Terminal 3 : Expo
npx expo start
```

### Après déploiement (future)

```bash
# Juste 1 terminal : Expo
npx expo start

# Le backend tourne sur Render/Fly.io
# URL fixe dans .env : EXPO_PUBLIC_API_BASE_URL=https://medflash-api.onrender.com
```

---

## 📊 Coûts

| Service | Plan | Coût | Limite |
|---------|------|------|--------|
| **Backend local** | - | Gratuit | Ton Mac |
| **Cloudflare Tunnel** | Free | Gratuit | Illimité |
| **Supabase** | Free | Gratuit | 500 MB DB + 50k users |
| **OpenAI** | Pay-as-you-go | ~0.10€/deck | API usage |
| **Render** | Free | Gratuit | 750h/mois |
| **Fly.io** | Free | Gratuit | 3 VMs |

**Total actuel** : 0€/mois + coût OpenAI à l'usage ✅

---

## 🔧 Scripts disponibles

### Backend

```bash
# Développement (watch mode)
npm run dev

# Production
npm start
```

### Cloudflare

```bash
# Quick Tunnel (URL change à chaque fois)
cloudflared tunnel --url http://127.0.0.1:3333

# Named Tunnel (URL stable)
cloudflared tunnel run medflash

# Tunnel en arrière-plan
cloudflared tunnel run medflash &

# Autostart au boot (Mac)
cloudflared service install
```

### App

```bash
# Dev
npx expo start

# Clean cache
npx expo start -c

# Build iOS (nécessite Mac)
eas build --platform ios

# Build Android
eas build --platform android
```

---

## 🐛 Dépannage

### Le tunnel ne marche pas

```bash
# 1. Vérifie que le backend répond
curl http://localhost:3333/health

# 2. Supprime le config cloudflared si erreur 404
mv ~/.cloudflared/config.yml ~/.cloudflared/config.yml.backup

# 3. Redémarre cloudflared
cloudflared tunnel --url http://127.0.0.1:3333
```

### L'app ne se connecte pas au backend

```bash
# 1. Vérifie le .env
cat .env | grep API_BASE_URL

# 2. Vérifie que MOCK_API=false
cat .env | grep MOCK_API

# 3. Redémarre Expo en clean
npx expo start -c
```

### Génération timeout

```bash
# 1. Vérifie la clé OpenAI
cat backend/.env | grep OPENAI_API_KEY

# 2. Vérifie les logs backend
# Regarde dans le terminal où tourne le backend

# 3. Teste manuellement
curl -X POST http://localhost:3333/v1/jobs \
  -F "file=@test.pdf" \
  -F "level=PASS"
```

---

## 📝 Checklist de production

Avant de partager l'app avec des vrais users :

- [ ] Named Tunnel configuré (URL stable)
- [ ] SQLite en place (plus robuste que JSON)
- [ ] Variables d'env sécurisées (pas de secrets hardcodés)
- [ ] Rate limiting activé (déjà fait ✅)
- [ ] Logs propres (pas de console.log sensibles)
- [ ] Error handling (déjà fait ✅)
- [ ] Déploiement backend (Render/Fly.io)
- [ ] Monitoring (optionnel : Sentry, LogRocket)
- [ ] Backup DB automatique

---

## 🎉 Résumé

### Ce qui fonctionne maintenant

✅ Backend Node.js sur ton Mac  
✅ Tunnel Cloudflare HTTPS  
✅ App Expo connectée au backend  
✅ Génération de cartes via OpenAI  
✅ Auth Supabase (si configuré)  

### Prochaines étapes recommandées

1. **Teste l'import** (maintenant)
2. **Named Tunnel** (15 min) → URL stable
3. **SQLite** (30 min) → Backend robuste
4. **Deploy** (optionnel) → Backend 24/7

### Questions ?

- 📖 Guide Named Tunnel : `bash scripts/setup-named-tunnel.sh`
- 📖 Guide SQLite : `cat scripts/MIGRATION-SQLITE.md`
- 📖 Guide Supabase : `cat scripts/setup-supabase.md`

Bon dev ! 🚀

