// backend/src/storeSQLite.js
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

/**
 * Initialise la base de données SQLite
 */
export async function initStore() {
  const dataDir = join(__dirname, "../data");
  mkdirSync(dataDir, { recursive: true });
  
  const dbPath = process.env.DB_PATH || join(dataDir, "medflash.db");
  
  db = new Database(dbPath);
  // --- MIGRATION: ancien deck_owners -> client_id ---
  try {
    const hasDeckOwners = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='deck_owners'")
      .get();

    if (hasDeckOwners) {
      const cols = db.prepare("PRAGMA table_info(deck_owners)").all().map(r => r.name);

      if (!cols.includes("client_id")) {
        db.exec("ALTER TABLE deck_owners ADD COLUMN client_id TEXT");

        if (cols.includes("client_key")) {
          db.exec("UPDATE deck_owners SET client_id=client_key WHERE client_id IS NULL OR client_id=''");
        }
        if (cols.includes("client_ip")) {
          db.exec("UPDATE deck_owners SET client_id=client_ip WHERE (client_id IS NULL OR client_id='') AND client_ip IS NOT NULL");
        }
        db.exec("UPDATE deck_owners SET client_id='unknown' WHERE client_id IS NULL OR client_id=''");
      }
    }
  } catch (e) {
    console.warn("[initStore] migration deck_owners skipped:", e?.message || e);
  }

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
    // Convertir camelCase en snake_case
    const snakeKey = key.replace(/[A-Z]/g, m => "_" + m.toLowerCase());
    fields.push(`${snakeKey} = @${key}`);
    
    // Convertir boolean en integer pour SQLite
    if (typeof value === 'boolean') {
      values[key] = value ? 1 : 0;
    } else {
      values[key] = value;
    }
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
export function getDeck(deckId, clientId = null, isSubscribed = false) {
  // Abonné : accès sans filtre (optionnel)
  if (isSubscribed) {
    return db.prepare("SELECT * FROM decks WHERE id=?").get(deckId) ?? null;
  }

  // Pas de clientId => on refuse (sécurité)
  if (!clientId) return null;

  // Free : accès uniquement aux decks appartenant au client
  return (
    db.prepare(`
      SELECT d.*
      FROM decks d
      JOIN deck_owners o ON o.deck_id = d.id
      WHERE d.id = ?
        AND o.client_id = ?
        AND o.deleted_at IS NULL
    `).get(deckId, clientId) ?? null
  );
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

// ============================================================
// GARDE-FOU FREE/PREMIUM (clients + deck_owners)
// ============================================================

function mustDb() {
  if (!db) throw new Error("SQLite not initialized. Call initStore() first.");
  return db;
}

export function ensureClient(clientId) {
  const d = mustDb();
  const now = Date.now();

  d.prepare(`
    INSERT OR IGNORE INTO clients (client_id, is_subscribed, created_at, updated_at)
    VALUES (?, 0, ?, ?)
  `).run(clientId, now, now);

  d.prepare(`
    UPDATE clients SET updated_at=? WHERE client_id=?
  `).run(now, clientId);
}

export function getClientStatus(clientId) {
  const d = mustDb();
  const row = d.prepare(`
    SELECT client_id, is_subscribed, created_at, updated_at
    FROM clients
    WHERE client_id=?
  `).get(clientId);

  if (!row) return { clientId, isSubscribed: false };

  return {
    clientId: row.client_id,
    isSubscribed: Boolean(row.is_subscribed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function setClientSubscribed(clientId, isSubscribed) {
  ensureClient(clientId);
  const d = mustDb();
  const now = Date.now();

  d.prepare(`
    UPDATE clients
    SET is_subscribed=?, updated_at=?
    WHERE client_id=?
  `).run(isSubscribed ? 1 : 0, now, clientId);
}

export function saveDeckOwner(deckId, clientId) {
  ensureClient(clientId);
  const d = mustDb();
  const now = Date.now();

  d.prepare(`
    INSERT OR REPLACE INTO deck_owners (deck_id, client_id, created_at, deleted_at)
    VALUES (?, ?, ?, NULL)
  `).run(deckId, clientId, now);
}

export function countActiveDecksByClient(clientId) {
  const d = mustDb();
  const row = d.prepare(`
    SELECT COUNT(*) AS n
    FROM deck_owners
    WHERE client_id=? AND deleted_at IS NULL
  `).get(clientId);

  return Number(row?.n ?? 0);
}

export function softDeleteDeckForClient(deckId, clientId) {
  const d = mustDb();
  const now = Date.now();

  const info = d.prepare(`
    UPDATE deck_owners
    SET deleted_at=?
    WHERE deck_id=? AND client_id=? AND deleted_at IS NULL
  `).run(now, deckId, clientId);

  return info.changes > 0;
}
