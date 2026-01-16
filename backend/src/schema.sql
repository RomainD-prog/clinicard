-- ============================================
-- SCHEMA SQLITE POUR MEDFLASH BACKEND
-- ============================================

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

