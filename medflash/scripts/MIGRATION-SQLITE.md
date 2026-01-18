# 💾 Migration JSON → SQLite

Ce guide explique comment remplacer le stockage JSON par SQLite dans ton backend.

## 🎯 Pourquoi SQLite ?

✅ **Avantages** :
- **Gratuit** et sans serveur externe
- **Plus robuste** que JSON (transactions, concurrent access)
- **Plus rapide** pour les requêtes
- **Pas de setup** : fichier local comme JSON
- **Production-ready** : utilisé par des millions d'apps

❌ **Inconvénients** :
- Fichier unique (pas distribué)
- Pas de scaling horizontal natif
- Mais **largement suffisant** pour ton MVP !

---

## 📦 Étape 1 : Installation

```bash
cd backend

# better-sqlite3 = wrapper Node.js performant pour SQLite
npm install better-sqlite3
```

---

## 📝 Étape 2 : Créer le schema SQL

Crée `backend/src/schema.sql` :

```sql
-- Table des jobs de génération
CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  stage TEXT,
  progress REAL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  level TEXT,
  requested_cards INTEGER,
  requested_mcq INTEGER,
  final_cards INTEGER,
  final_mcq INTEGER,
  plan_days INTEGER,
  medical_style INTEGER DEFAULT 1,
  language TEXT DEFAULT 'fr',
  auto_counts INTEGER DEFAULT 0,
  intensity TEXT DEFAULT 'standard',
  est_words INTEGER,
  est_pages REAL,
  deck_id TEXT,
  error TEXT
);

-- Table des decks
CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  level TEXT,
  subject TEXT,
  created_at INTEGER NOT NULL,
  source_filename TEXT,
  plan_7d TEXT, -- JSON stringifié
  cards TEXT NOT NULL, -- JSON stringifié
  mcqs TEXT NOT NULL -- JSON stringifié
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decks_created_at ON decks(created_at DESC);
```

---

## 🔧 Étape 3 : Créer le nouveau store SQLite

Crée `backend/src/storeSQLite.js` :

```javascript
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

/**
 * Initialise la base de données SQLite
 */
export async function initStore() {
  const dbPath = process.env.DB_PATH || join(__dirname, "../data/medflash.db");
  
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL"); // Performance boost
  db.pragma("foreign_keys = ON");
  
  // Créer les tables
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  db.exec(schema);
  
  console.log("✅ SQLite database initialized:", dbPath);
}

/**
 * Créer un job
 */
export async function createJob(job) {
  const stmt = db.prepare(`
    INSERT INTO jobs (
      job_id, status, stage, progress, created_at, updated_at,
      level, requested_cards, requested_mcq, plan_days,
      medical_style, language, auto_counts, intensity
    ) VALUES (
      @jobId, @status, @stage, @progress, @createdAt, @updatedAt,
      @level, @requestedCards, @requestedMcq, @planDays,
      @medicalStyle, @language, @autoCounts, @intensity
    )
  `);
  
  stmt.run({
    jobId: job.jobId,
    status: job.status,
    stage: job.stage || null,
    progress: job.progress || 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    level: job.level || null,
    requestedCards: job.requestedCards || null,
    requestedMcq: job.requestedMcq || null,
    planDays: job.planDays || null,
    medicalStyle: job.medicalStyle ? 1 : 0,
    language: job.language || 'fr',
    autoCounts: job.autoCounts ? 1 : 0,
    intensity: job.intensity || 'standard',
  });
}

/**
 * Récupérer un job
 */
export function getJob(jobId) {
  const stmt = db.prepare("SELECT * FROM jobs WHERE job_id = ?");
  const row = stmt.get(jobId);
  
  if (!row) return null;
  
  // Convertir les colonnes SQLite en format JS
  return {
    jobId: row.job_id,
    status: row.status,
    stage: row.stage,
    progress: row.progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    level: row.level,
    requestedCards: row.requested_cards,
    requestedMcq: row.requested_mcq,
    finalCards: row.final_cards,
    finalMcq: row.final_mcq,
    planDays: row.plan_days,
    medicalStyle: Boolean(row.medical_style),
    language: row.language,
    autoCounts: Boolean(row.auto_counts),
    intensity: row.intensity,
    estWords: row.est_words,
    estPages: row.est_pages,
    deckId: row.deck_id,
    error: row.error,
  };
}

/**
 * Mettre à jour un job
 */
export async function updateJob(jobId, updates) {
  const fields = [];
  const values = { jobId };
  
  // Construire dynamiquement la requête UPDATE
  for (const [key, value] of Object.entries(updates)) {
    const snakeKey = key.replace(/[A-Z]/g, m => "_" + m.toLowerCase());
    fields.push(`${snakeKey} = @${key}`);
    values[key] = value;
  }
  
  values.updatedAt = Date.now();
  fields.push("updated_at = @updatedAt");
  
  const stmt = db.prepare(`
    UPDATE jobs
    SET ${fields.join(", ")}
    WHERE job_id = @jobId
  `);
  
  stmt.run(values);
}

/**
 * Sauvegarder un deck
 */
export async function saveDeck(deck) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO decks (
      id, title, level, subject, created_at, source_filename,
      plan_7d, cards, mcqs
    ) VALUES (
      @id, @title, @level, @subject, @createdAt, @sourceFilename,
      @plan7d, @cards, @mcqs
    )
  `);
  
  stmt.run({
    id: deck.id,
    title: deck.title,
    level: deck.level || null,
    subject: deck.subject || null,
    createdAt: deck.createdAt,
    sourceFilename: deck.sourceFilename || null,
    plan7d: JSON.stringify(deck.plan7d || []),
    cards: JSON.stringify(deck.cards || []),
    mcqs: JSON.stringify(deck.mcqs || []),
  });
}

/**
 * Récupérer un deck
 */
export function getDeck(deckId) {
  const stmt = db.prepare("SELECT * FROM decks WHERE id = ?");
  const row = stmt.get(deckId);
  
  if (!row) return null;
  
  return {
    id: row.id,
    title: row.title,
    level: row.level,
    subject: row.subject,
    createdAt: row.created_at,
    sourceFilename: row.source_filename,
    plan7d: JSON.parse(row.plan_7d || "[]"),
    cards: JSON.parse(row.cards || "[]"),
    mcqs: JSON.parse(row.mcqs || "[]"),
  };
}

/**
 * Fermer la base de données (pour les tests ou shutdown)
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
```

---

## 🔄 Étape 4 : Remplacer dans index.js

Dans `backend/src/index.js`, remplace :

```javascript
// AVANT
import { createJob, getDeck, getJob, initStore, saveDeck, updateJob } from "./store.js";

// APRÈS
import { createJob, getDeck, getJob, initStore, saveDeck, updateJob } from "./storeSQLite.js";
```

C'est **tout** ! L'API reste identique, juste le backend change. ✅

---

## ✅ Étape 5 : Tester

```bash
# Redémarre le backend
cd backend
npm run dev
```

Tu devrais voir :
```
✅ SQLite database initialized: /path/to/backend/data/medflash.db
Backend on http://0.0.0.0:3333
```

Teste un import depuis l'app : ça devrait marcher exactement pareil !

---

## 🔍 Étape 6 : Inspecter la DB (optionnel)

Pour voir ce qu'il y a dans ta DB SQLite :

```bash
# Installer un viewer SQLite (optionnel)
brew install --cask db-browser-for-sqlite

# Ou en ligne de commande
sqlite3 backend/data/medflash.db
```

Dans le shell SQLite :

```sql
-- Voir tous les jobs
SELECT job_id, status, progress FROM jobs ORDER BY created_at DESC LIMIT 10;

-- Voir tous les decks
SELECT id, title, created_at FROM decks ORDER BY created_at DESC;

-- Quitter
.quit
```

---

## 📊 Comparaison JSON vs SQLite

| Aspect | JSON (actuel) | SQLite |
|--------|---------------|---------|
| **Performance** | ⚠️ Lent si gros fichier | ✅ Rapide même avec beaucoup de données |
| **Concurrent access** | ❌ Risque de corruption | ✅ Transactions ACID |
| **Requêtes** | ❌ Charger tout en mémoire | ✅ Requêtes SQL optimisées |
| **Backup** | ✅ Copier un fichier | ✅ Copier un fichier |
| **Setup** | ✅ Aucun | ✅ Aucun |
| **Gratuit** | ✅ Oui | ✅ Oui |

---

## 🚀 Prochaines étapes (optionnelles)

### 1. Migration des données existantes

Si tu as des données JSON importantes, crée un script de migration :

```javascript
// migrate.js
import { initStore as initOld, listAllJobs, listAllDecks } from "./store.js";
import { initStore as initNew, createJob, saveDeck } from "./storeSQLite.js";

async function migrate() {
  await initOld();
  await initNew();
  
  const jobs = await listAllJobs();
  const decks = await listAllDecks();
  
  for (const job of jobs) {
    await createJob(job);
  }
  
  for (const deck of decks) {
    await saveDeck(deck);
  }
  
  console.log(`Migrated ${jobs.length} jobs and ${decks.length} decks`);
}

migrate();
```

### 2. Ajouter des stats

```javascript
// Dans storeSQLite.js
export function getStats() {
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total_jobs,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_jobs,
      COUNT(DISTINCT deck_id) as total_decks
    FROM jobs
  `);
  
  return stmt.get();
}
```

### 3. Cleanup automatique (optionnel)

Ajoute un cron pour supprimer les vieux jobs :

```javascript
// Supprimer les jobs de plus de 7 jours
export function cleanupOldJobs(daysOld = 7) {
  const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  const stmt = db.prepare("DELETE FROM jobs WHERE created_at < ?");
  const result = stmt.run(cutoff);
  return result.changes;
}
```

---

## 🎉 C'est tout !

SQLite est maintenant en place. Ton backend est **plus robuste**, **plus rapide**, et toujours **100% gratuit** ! 

Questions ? Problèmes ? Dis-moi ! 🚀

