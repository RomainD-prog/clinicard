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

