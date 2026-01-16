# MedFlash Backend

Backend Node.js/Express pour la génération de flashcards médicales via IA.

## 🚀 Démarrage rapide

### 1. Installation

```bash
npm install
```

### 2. Configuration

Copier `.env.example` en `.env` et remplir les valeurs :

```bash
cp .env.example .env
```

Variables requises :
- `OPENAI_API_KEY` : Votre clé API OpenAI (obligatoire)
- `PORT` : Port du serveur (défaut: 3333)
- `NODE_ENV` : development ou production
- `CORS_ORIGIN` : Origines CORS autorisées (défaut: *)

### 3. Lancer le serveur

```bash
# Mode développement (avec hot reload)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://0.0.0.0:3333`

## 📁 Structure

```
backend/
├── src/
│   ├── index.js          # Point d'entrée, API Express
│   ├── extract.js        # Extraction de texte depuis PDF
│   ├── generate.js       # Génération IA (OpenAI)
│   ├── storeSQLite.js    # Stockage SQLite
│   ├── backup.js         # Système de backup automatique
│   └── schema.sql        # Schéma de la base de données
├── data/
│   ├── medflash.db       # Base de données SQLite
│   └── backups/          # Backups automatiques
├── scripts/
│   └── backup-now.js     # Script de backup manuel
├── package.json
└── .env                  # Configuration (non versionné)
```

## 🔌 API Endpoints

### Health Check

```bash
GET /health
```

Retourne l'état du serveur.

### Créer un job de génération

```bash
POST /v1/jobs
Content-Type: multipart/form-data

file: <PDF file>
opts: {
  "level": "PASS",
  "intensity": "standard",
  "planDays": 7
}
```

Retourne :
```json
{
  "jobId": "abc123",
  "status": "processing"
}
```

### Récupérer l'état d'un job

```bash
GET /v1/jobs/:jobId
```

Retourne :
```json
{
  "jobId": "abc123",
  "status": "done",
  "progress": 1,
  "deckId": "deck_xyz",
  "finalCards": 25,
  "finalMcq": 8
}
```

### Récupérer un deck

```bash
GET /v1/decks/:deckId
```

Retourne le deck complet avec flashcards et QCM.

## 💾 Base de données

Le backend utilise **SQLite** avec le driver `better-sqlite3`.

### Backup automatique

En mode production (`NODE_ENV=production`), un backup automatique est créé :
- **Quotidiennement** (toutes les 24h)
- **Au démarrage** du serveur
- Les **7 derniers backups** sont conservés

Backups stockés dans : `data/backups/`

### Backup manuel

```bash
# Via npm
npm run backup

# Ou directement
node scripts/backup-now.js
```

### Restaurer un backup

```bash
# Arrêter le serveur
# Copier le backup désiré
cp data/backups/medflash-2026-01-12T10-00-00-000Z.db data/medflash.db
# Redémarrer le serveur
```

## 🔒 Sécurité

- ✅ **Helmet** : Headers de sécurité HTTP
- ✅ **CORS** : Configurable via `CORS_ORIGIN`
- ✅ **Rate Limiting** : 120 requêtes/minute par IP
- ✅ **File Size Limit** : 15 MB max pour les uploads
- ✅ **Trust Proxy** : Compatible avec reverse proxies

## 🐛 Debugging

### Logs

Le serveur affiche des logs détaillés dans la console :

```
[POST /v1/jobs] Nouvelle génération reçue
[Job abc123] Créé - level=PASS, intensity=standard
[Job abc123] Stage: extract
[Job abc123] Texte extrait: 12543 caractères
[Job abc123] Estimation: 25 cards, 8 QCM (30 pages)
[Job abc123] Génération IA démarrée...
[Job abc123] ✅ Terminé ! DeckId=deck_xyz
```

### Tester l'API

```bash
# Health check
curl http://localhost:3333/health

# Upload un PDF
curl -X POST http://localhost:3333/v1/jobs \
  -F "file=@test.pdf" \
  -F "opts={\"level\":\"PASS\",\"intensity\":\"standard\"}"

# Récupérer le status
curl http://localhost:3333/v1/jobs/abc123
```

## 📊 Monitoring

### Vérifier la DB

```bash
# Installer sqlite3 (si pas déjà fait)
brew install sqlite3

# Ouvrir la DB
sqlite3 data/medflash.db

# Requêtes utiles
SELECT COUNT(*) FROM jobs;
SELECT COUNT(*) FROM decks;
SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10;

# Quitter
.quit
```

### Statistiques

```sql
-- Nombre de jobs par statut
SELECT status, COUNT(*) FROM jobs GROUP BY status;

-- Jobs récents
SELECT job_id, status, stage, progress, created_at 
FROM jobs 
ORDER BY created_at DESC 
LIMIT 20;

-- Decks créés
SELECT id, title, level, created_at 
FROM decks 
ORDER BY created_at DESC;
```

## 🚀 Déploiement

### Option 1 : Local avec tunnel Cloudflare

Votre setup actuel avec `medflash-api.tri-pacer.fr` fonctionne parfaitement.

```bash
# Terminal 1 : Backend
npm start

# Terminal 2 : Tunnel Cloudflare
cloudflared tunnel run medflash
```

### Option 2 : Fly.io (recommandé pour production)

Voir `GUIDE-DEPLOIEMENT-RAPIDE.md` à la racine du projet.

### Option 3 : Render.com

Créer un `render.yaml` :

```yaml
services:
  - type: web
    name: medflash-backend
    env: node
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: NODE_ENV
        value: production
```

## 🔧 Maintenance

### Nettoyer les vieux backups

```bash
# Garder seulement les 7 derniers
cd data/backups
ls -t medflash-*.db | tail -n +8 | xargs rm
```

### Optimiser la DB SQLite

```bash
sqlite3 data/medflash.db "VACUUM;"
```

### Vérifier l'intégrité de la DB

```bash
sqlite3 data/medflash.db "PRAGMA integrity_check;"
```

## 📝 Variables d'environnement

| Variable | Description | Défaut | Requis |
|----------|-------------|--------|--------|
| `OPENAI_API_KEY` | Clé API OpenAI | - | ✅ Oui |
| `PORT` | Port du serveur | 3333 | Non |
| `NODE_ENV` | Environment | development | Non |
| `CORS_ORIGIN` | Origines CORS | * | Non |
| `DB_PATH` | Chemin DB SQLite | ./data/medflash.db | Non |

## 🆘 Troubleshooting

### Le serveur ne démarre pas

```bash
# Vérifier que le port n'est pas déjà utilisé
lsof -i :3333

# Vérifier les variables d'env
cat .env

# Vérifier les logs
npm run dev
```

### Erreur OpenAI

```bash
# Vérifier que la clé est valide
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### DB corrompue

```bash
# Restaurer depuis un backup
cp data/backups/medflash-LATEST.db data/medflash.db

# Ou réinitialiser (⚠️ perte de données)
rm data/medflash.db
npm start  # Recréera la DB
```

## 📚 Ressources

- [Express.js](https://expressjs.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [OpenAI API](https://platform.openai.com/docs)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)

---

Développé avec ❤️ pour MedFlash

