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
import * as gen from "./generate.js";

// Fallbacks: on évite de crasher si generate.js ne fournit pas certaines fonctions
const generateDeckFromText = gen.generateDeckFromText;
const analyzeExamBlueprint = gen.analyzeExamBlueprint ?? (async () => null);

import {
  createJob,
  getDeck,
  getJob,
  initStore,
  saveDeck,
  updateJob,

  // quota/premium
  ensureClient,
  getClientStatus,
  setClientSubscribed,
  saveDeckOwner,
  countActiveDecksByClient,
  softDeleteDeckForClient,
} from "./storeSQLite.js";

const app = express();

// utile derrière proxy (Caddy/Cloudflare/etc.)
app.set("trust proxy", 1);
app.use(helmet());

// CORS configurable (dev: * ; prod: liste séparée par virgule)
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map((s) => s.trim()),
  })
);

app.use(express.json({ limit: "1mb" }));

// rate limit global
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// upload multipart (PDF)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// ==============================
// QUOTA FREE/PREMIUM
// ==============================
const FREE_DECK_LIMIT = Number(process.env.FREE_DECK_LIMIT ?? 5);

function getClientId(req) {
  const h =
    req.get("x-medflash-client") ||
    req.get("x-client-id") ||
    req.get("x-device-id") ||
    req.get("x-user-id");

  if (h && String(h).trim()) return String(h).trim().slice(0, 128);

  const cf = req.get("cf-connecting-ip");
  if (cf && String(cf).trim()) return String(cf).trim().slice(0, 128);

  return String(req.ip || "unknown").slice(0, 128);
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

async function loadUsage(req, res, next) {
  try {
    const clientId = getClientId(req);
    ensureClient(clientId);

    const status = getClientStatus(clientId);
    const deckCount = countActiveDecksByClient(clientId);

    const isSubscribed = Boolean(status?.isSubscribed);
    const canGenerate = isSubscribed || deckCount < FREE_DECK_LIMIT;
    const remaining = isSubscribed ? null : Math.max(0, FREE_DECK_LIMIT - deckCount);

    res.locals.medflash = {
      clientId,
      isSubscribed,
      deckCount,
      freeLimit: FREE_DECK_LIMIT,
      canGenerate,
      remaining,
    };

    // headers debug
    res.setHeader("X-Medflash-Client", clientId);
    res.setHeader("X-Medflash-Deck-Count", String(deckCount));
    res.setHeader("X-Medflash-Free-Limit", String(FREE_DECK_LIMIT));
    res.setHeader("X-Medflash-Can-Generate", String(canGenerate));

    next();
  } catch (e) {
    console.error("[usage middleware]", safeErr(e));
    res.status(500).json({ error: "quota_check_failed" });
  }
}

function enforceFreeLimit(req, res, next) {
  const u = res.locals.medflash;
  if (!u?.canGenerate) {
    return res.status(402).json({
      error: "free_limit_reached",
      freeLimit: u.freeLimit,
      deckCount: u.deckCount,
      remaining: u.remaining,
    });
  }
  next();
}

// ==============================
// ROUTES
// ==============================
function estimateCountsFromText(text, intensity = "standard") {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  const pages = Math.max(1, words / 420);

  const cardsPerPage = intensity === "light" ? 6 : intensity === "max" ? 14 : 10;

  let cards = Math.round(pages * cardsPerPage);
  cards = Math.max(10, cards);

  let mcqs = Math.round(cards / 3);
  mcqs = Math.max(5, mcqs);

  return { cards, mcqs, words, pages: Number(pages.toFixed(1)) };
}

function parseJSONMaybe(v, fallback) {
  if (v == null) return fallback;
  if (Array.isArray(v)) return v;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

app.get("/health", (_, res) => res.json({ ok: true, uptime: process.uptime() }));

// état quota
app.get("/v1/usage", loadUsage, (req, res) => {
  res.json(res.locals.medflash);
});

// soft-delete (optionnel)
app.delete("/v1/decks/:deckId", loadUsage, (req, res) => {
  try {
    const { clientId } = res.locals.medflash;
    const ok = softDeleteDeckForClient(req.params.deckId, clientId);
    if (!ok) return res.status(404).json({ error: "not_found_or_not_owner" });
    res.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /v1/decks]", safeErr(e));
    res.status(500).json({ error: "server_error" });
  }
});

// admin: set premium (protégé par token)
app.post("/v1/admin/subscription", (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return res.status(404).json({ error: "disabled" });

  const got = req.get("x-admin-token");
  if (got !== token) return res.status(403).json({ error: "forbidden" });

  const { clientId, isSubscribed } = req.body || {};
  if (!clientId) return res.status(400).json({ error: "clientId_required" });

  setClientSubscribed(String(clientId), Boolean(isSubscribed));
  res.json({ ok: true });
});

// créer job
app.post(
  "/v1/jobs",
  loadUsage,
  enforceFreeLimit,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "exam", maxCount: 1 },
    { name: "examFile", maxCount: 1 }, // compat ancien front
  ]),
  async (req, res) => {
    try {
      console.log("[POST /v1/jobs] Nouvelle génération reçue");

      const clientId = res.locals.medflash.clientId;

      const courseUpload = req.files?.file?.[0];
      const examUpload = req.files?.exam?.[0] || req.files?.examFile?.[0];

      if (!courseUpload?.buffer) return res.status(400).json({ error: "file manquant" });

      // opts peut venir en JSON string (multipart)
      let opts = null;
      if (req.body?.opts) {
        try {
          opts = typeof req.body.opts === "string" ? JSON.parse(req.body.opts) : req.body.opts;
        } catch {
          opts = null;
    }
      }

      const level = opts?.level ?? req.body.level ?? "PASS";
      const subject = (opts?.subject ?? req.body.subject) || undefined;

      const requestedCards = clampInt(
        opts?.flashcardsCount ?? req.body.cardsCount ?? req.body.flashcardsCount ?? 20,
        5,
        500,
        20
      );
      const requestedMcq = clampInt(opts?.mcqCount ?? req.body.mcqCount ?? 10, 0, 500, 10);
      const planDays = clampInt(opts?.planDays ?? req.body.planDays ?? 7, 0, 14, 7);
      const medicalStyle = parseBool(opts?.medicalStyle ?? req.body.medicalStyle, true);
      const language = opts?.language ?? req.body.language ?? "fr";

      // auto estimation
      const autoCounts = true;
      const intensity = opts?.intensity ?? req.body.intensity ?? "standard";

      // mode concours
      const examGuided = parseBool(opts?.examGuided ?? req.body.examGuided, false);
      const examInfluenceRaw = String(opts?.examInfluence ?? req.body.examInfluence ?? "medium");
      const examInfluence = ["low", "medium", "high"].includes(examInfluenceRaw) ? examInfluenceRaw : "medium";
      const useExam = Boolean(examGuided && examUpload?.buffer);

      const jobId = nanoid();

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

      // background async
      setImmediate(async () => {
        let stage = "extract";
        let finalCards = requestedCards;
        let finalMcq = requestedMcq;

        try {
          await updateJob(jobId, { status: "processing", stage, progress: 0.1 });

          const text = await extractTextFromUpload({
            buffer: courseUpload.buffer,
            mimeType: courseUpload.mimetype,
          });

          if (!text || text.length < 500) {
            throw new Error("Texte insuffisant extrait du PDF. Si c'est un scan, OCR nécessaire (MVP).");
          }

          let examBlueprint = null;
          if (useExam) {
            stage = "extract_exam";
            await updateJob(jobId, { stage, progress: 0.14 });

            const examText = await extractTextFromUpload({
              buffer: examUpload.buffer,
              mimeType: examUpload.mimetype,
            });

            if (examText && examText.length >= 300) {
              stage = "analyze_exam";
              await updateJob(jobId, { stage, progress: 0.20 });

              examBlueprint = await analyzeExamBlueprint({
                text: examText,
                level,
                language,
              });

              await updateJob(jobId, { stage, progress: 0.24 });
            }
          }

          // estimation
          stage = "estimate";
          await updateJob(jobId, { stage, progress: useExam ? 0.28 : 0.22 });

          const es = estimateCountsFromText(text, intensity);
finalCards = es.cards;
finalMcq = es.mcqs;

await updateJob(jobId, {
  stage,
  progress: useExam ? 0.34 : 0.28,
  estWords: es.words,
  estPages: es.pages,
  finalCards,
  finalMcq,
});

          // génération
          stage = "generate";
          await updateJob(jobId, { stage, progress: 0.40, finalCards, finalMcq });

          const deck = await generateDeckFromText({
            text,
            level,
            subject,
            cardsCount: finalCards,
            mcqCount: finalMcq,
            planDays,
            medicalStyle,
            language,
            examBlueprint,
            examInfluence,
            sourceFilename: courseUpload.originalname,
          });

          // save
          stage = "save";
          await updateJob(jobId, { stage, progress: 0.9 });

          await saveDeck(deck);
          saveDeckOwner(deck.id, clientId);

          await updateJob(jobId, {
            status: "done",
            stage: "done",
            progress: 1,
            deckId: deck.id,
            finalCards,
            finalMcq,
          });

          console.log(`[Job ${jobId}] ✅ Terminé ! DeckId=${deck.id}`);
        } catch (e) {
          console.error("[job error]", `jobId=${jobId}`, `stage=${stage}`, safeErr(e));
          await updateJob(jobId, {
            status: "error",
            stage,
            progress: 1,
            error: e?.message ?? "unknown_error",
          });
        }
      });
    } catch (e) {
      console.error("[POST /v1/jobs error]", safeErr(e));
      res.status(500).json({ error: e?.message ?? "server_error" });
    }
  }
);

// état job
app.get("/v1/jobs/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "not_found" });
  res.json(job);
});

// récupérer deck
// récupérer deck
app.get("/v1/decks/:deckId", loadUsage, (req, res) => {
  const { clientId, isSubscribed } = res.locals.medflash;

  const deck = getDeck(req.params.deckId, clientId, isSubscribed);
  if (!deck) return res.status(404).json({ error: "not_found" });

  const out = {
    ...deck,
    plan_7d: parseJSONMaybe(deck.plan_7d, []),
    cards: parseJSONMaybe(deck.cards, []),
    mcqs: parseJSONMaybe(deck.mcqs, []),
  };

  return res.json(out);
});


// start
(async () => {
  await initStore();

  if (process.env.NODE_ENV === "production") {
    console.log("🔄 Backup automatique activé (quotidien)");
    backupDatabase();
  }

  const port = Number(process.env.PORT ?? 3333);
  app.listen(port, "0.0.0.0", () => console.log(`Backend on http://0.0.0.0:${port}`));
})();
