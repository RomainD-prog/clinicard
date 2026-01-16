// backend/src/index.js
import cors from "cors";
import "dotenv/config";
import express from "express";
import multer from "multer";
import { nanoid } from "nanoid";

import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { backupDatabase } from "./backup.js";
import { extractTextFromUpload } from "./extract.js";
import { generateDeckFromText } from "./generate.js";
import { createJob, getDeck, getJob, initStore, saveDeck, updateJob } from "./storeSQLite.js";

const app = express();

// ✅ utile derrière Render/Fly/Proxy
app.set("trust proxy", 1);

// ✅ headers sécurité
app.use(helmet());

// ✅ CORS configurable (dev: * ; prod: ton domaine)
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map(s => s.trim()) }));

app.use(express.json({ limit: "1mb" }));

// ✅ rate limit global (ajuste au besoin)
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120, // 120 req/min/ip
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// ---------- helpers ----------
function clampInt(v, min, max, fallback = min) {
  const n = Math.floor(Number(v));
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
function parseBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v !== "string") return fallback;
  const s = v.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;
  return fallback;
}
function safeErr(e) {
  try {
    if (e instanceof Error) return e.stack || e.message;
    if (typeof e === "string") return e;
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}

function estimateCountsFromText(text, intensity = "standard") {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  const pages = Math.max(1, words / 420);

  const cardsPerPage = intensity === "light" ? 6 : intensity === "max" ? 14 : 10;
  let cards = Math.round(pages * cardsPerPage);
  cards = Math.max(10, cards); // Minimum 10, pas de max artificiel

  let mcqs = Math.round(cards / 3);
  mcqs = Math.max(5, mcqs); // Minimum 5 QCM

  return { cards, mcqs, words, pages: Number(pages.toFixed(1)) };
}
// ----------------------------

app.get("/health", (_, res) => res.json({ ok: true, uptime: process.uptime() }));

app.post("/v1/jobs", upload.single("file"), async (req, res) => {
  try {
    console.log("[POST /v1/jobs] Nouvelle génération reçue");
    if (!req.file?.buffer) return res.status(400).json({ error: "file manquant" });

    let opts = null;
    if (req.body?.opts) {
      try {
        opts = typeof req.body.opts === "string" ? JSON.parse(req.body.opts) : req.body.opts;
      } catch {
        opts = null;
      }
    }

    const level = opts?.level ?? req.body.level ?? "PASS";
    const requestedCards = clampInt(opts?.flashcardsCount ?? req.body.cardsCount ?? req.body.flashcardsCount ?? 20, 5, 500, 20);
    const requestedMcq = clampInt(opts?.mcqCount ?? req.body.mcqCount ?? 10, 0, 500, 10);
    const planDays = clampInt(opts?.planDays ?? req.body.planDays ?? 7, 0, 14, 7);
    const medicalStyle = parseBool(opts?.medicalStyle ?? req.body.medicalStyle, true);
    const language = opts?.language ?? req.body.language ?? "fr";

    // ✅ Toujours en mode auto maintenant
    const autoCounts = true;
    const intensity = opts?.intensity ?? req.body.intensity ?? "standard";

    const jobId = nanoid();
    console.log(`[Job ${jobId}] Créé - level=${level}, intensity=${intensity}`);

    await createJob({
      jobId,
      status: "processing",
      stage: "queued",
      progress: 0.02,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      level,
      requestedCards,
      requestedMcq,
      planDays,
      medicalStyle,
      language,
      autoCounts,
      intensity,
    });

    res.json({ jobId, status: "processing" });

    setImmediate(async () => {
      let stage = "extract";
      let finalCards = requestedCards;
      let finalMcq = requestedMcq;

      try {
        console.log(`[Job ${jobId}] Stage: extract`);
        await updateJob(jobId, { status: "processing", stage, progress: 0.1 });

        const text = await extractTextFromUpload({
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
        });

        console.log(`[Job ${jobId}] Texte extrait: ${text.length} caractères`);

        if (!text || text.length < 500) {
          throw new Error("Texte insuffisant extrait du PDF. Si c'est un scan, OCR nécessaire (MVP).");
        }

        if (autoCounts) {
          stage = "estimate";
          await updateJob(jobId, { stage, progress: 0.22 });

          const est = estimateCountsFromText(text, intensity);
          // ✅ L'IA décide librement selon le contenu, pas de limite artificielle
          finalCards = est.cards;
          finalMcq = est.mcqs;

          console.log(`[Job ${jobId}] Estimation: ${finalCards} cards, ${finalMcq} QCM (${est.pages} pages)`);

          await updateJob(jobId, {
            stage,
            progress: 0.28,
            estWords: est.words,
            estPages: est.pages,
            finalCards,
            finalMcq,
          });
        }

        stage = "generate";
        await updateJob(jobId, { stage, progress: 0.35, finalCards, finalMcq });
        console.log(`[Job ${jobId}] Génération IA démarrée...`);

        const deck = await generateDeckFromText({
          text,
          level,
          cardsCount: finalCards,
          mcqCount: finalMcq,
          planDays,
          medicalStyle,
          language,
        });

        stage = "save";
        await updateJob(jobId, { stage, progress: 0.9 });
        console.log(`[Job ${jobId}] Génération terminée, sauvegarde...`);

        await saveDeck(deck);
        await updateJob(jobId, { status: "done", stage: "done", progress: 1, deckId: deck.id, finalCards, finalMcq });
        console.log(`[Job ${jobId}] ✅ Terminé ! DeckId=${deck.id}`);
      } catch (e) {
        console.error("[job error]", `jobId=${jobId}`, `stage=${stage}`, safeErr(e));
        await updateJob(jobId, { status: "error", stage, progress: 1, error: e?.message ?? "unknown_error" });
      }
    });
  } catch (e) {
    console.error("[POST /v1/jobs error]", safeErr(e));
    res.status(500).json({ error: e?.message ?? "server_error" });
  }
});

app.get("/v1/jobs/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "not_found" });
  res.json(job);
});

app.get("/v1/decks/:deckId", (req, res) => {
  const deck = getDeck(req.params.deckId);
  if (!deck) return res.status(404).json({ error: "not_found" });
  res.json(deck);
});

(async () => {
  await initStore();
  
  // Backup automatique en production
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Backup automatique activé (quotidien)');
    backupDatabase(); // Backup initial
  }
  
  const port = Number(process.env.PORT ?? 3333);
  app.listen(port, "0.0.0.0", () => console.log(`Backend on http://0.0.0.0:${port}`));
})();
