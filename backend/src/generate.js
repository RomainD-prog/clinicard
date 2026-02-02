// backend/src/generate.js
import { nanoid } from "nanoid";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --------------------
// Zod schemas (STRUCTURED OUTPUTS)
// --------------------
const CardOut = z.object({
  question: z.string().min(3),
  answer: z.string().min(1),
});

const McqOut = z.object({
  question: z.string().min(3),
  options: z.array(z.string().min(1)).min(3).max(6),
  correctIndex: z.number().int().min(0).max(5),
  explanation: z.string().min(1),
});

// IMPORTANT: plan7d non strict 7, on accepte 0..14
const DeckOut = z.object({
  title: z.string().min(3).max(120),
  cards: z.array(CardOut).min(1).max(200),
  mcqs: z.array(McqOut).max(200),
  plan7d: z.array(z.string().min(1)).max(14),
});

const CardsOnlyOut = z.object({
  cards: z.array(CardOut).min(1).max(200),
});

const McqsOnlyOut = z.object({
  mcqs: z.array(McqOut).min(1).max(200),
});

const PlanOnlyOut = z.object({
  plan7d: z.array(z.string().min(1)).max(14),
});

// --- Blueprint d'annales (abstrait) pour guider le style des QCM/flashcards
const ExamBlueprintOut = z.object({
  examName: z.string().max(120).optional(),
  questionFormats: z.array(z.string().min(2).max(120)).min(1).max(15),
  typicalOptionCount: z
    .object({
      min: z.number().int().min(2).max(6),
      max: z.number().int().min(2).max(6),
    })
    .optional(),
  difficultyMix: z
    .object({
      easy: z.number().min(0).max(1),
      medium: z.number().min(0).max(1),
      hard: z.number().min(0).max(1),
    })
    .optional(),
  commonTraps: z.array(z.string().min(2).max(140)).max(15).default([]),
  styleNotes: z.array(z.string().min(2).max(200)).max(15).default([]),
  topicsToEmphasize: z.array(z.string().min(2).max(120)).max(20).default([]),
});

// --------------------
// Models / Router
// --------------------
const MODEL_FAST = process.env.OPENAI_MODEL_FAST || "gpt-4o-mini";
const MODEL_SMART = process.env.OPENAI_MODEL_SMART || "gpt-5-mini";

/**
 * Approx tokens from chars (rough but good enough for routing).
 * Typical FR text: ~4 chars/token.
 */
function approxTokensFromChars(chars) {
  return Math.ceil((chars || 0) / 4);
}

/**
 * Heuristic complexity score (0..6).
 * Goal: escalate only when inputs are long/technical/structured.
 */
function complexityScore(text) {
  const t = text || "";
  const tokens = approxTokensFromChars(t.length);

  const hasTable = (t.match(/\|.{2,}\|/g) || []).length;
  const bullets = (t.match(/^\s*[-•*]\s+/gm) || []).length;
  const enums = (t.match(/^\s*\d+[\).]\s+/gm) || []).length;
  const acronyms = (t.match(/\b[A-Z]{3,}\b/g) || []).length;
  const units = (t.match(/\b(mg|g|µg|ug|mmol|mEq|UI|IU|%|cm|mm|°C)\b/gi) || []).length;

  let score = 0;
  if (tokens > 12000) score += 2;
  if (tokens > 20000) score += 2;
  if (hasTable > 8) score += 1;
  if (bullets + enums > 120) score += 1;
  if (acronyms > 120) score += 1;
  if (units > 120) score += 1;

  return Math.min(score, 6);
}

function pickModel(text) {
  const score = complexityScore(text);
  const threshold = Number(process.env.OPENAI_ROUTER_THRESHOLD ?? 4);
  return score >= threshold ? MODEL_SMART : MODEL_FAST;
}

// --------------------
// Utils
// --------------------
function clampInt(v, min, max) {
  const n = Math.floor(Number(v));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function parseIntensity(v) {
  if (v === "light" || v === "standard" || v === "max") return v;
  return "standard";
}

/**
 * Heuristique MVP : estime un nombre "raisonnable" de cartes/QCM en fonction de la longueur.
 * - On approxime pages ≈ mots / 320
 * - PASS => plus granularité, EDN_ECOS => un peu moins
 */
export function estimateCountsFromText(text, { level = "PASS", intensity = "standard" } = {}) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  const words = clean ? clean.split(" ").length : 0;

  // approx pages
  const pagesApprox = Math.max(1, Math.round(words / 320));

  const baseCardsPerPage = level === "EDN_ECOS" ? 6 : 8;
  const baseMcqPerPage = level === "EDN_ECOS" ? 1.0 : 1.3;

  const k = intensity === "light" ? 0.75 : intensity === "max" ? 1.25 : 1.0;

  const recommendedCards = clampInt(Math.round(pagesApprox * baseCardsPerPage * k), 5, 200);
  const recommendedMcqs = clampInt(Math.round(pagesApprox * baseMcqPerPage * k), 0, 200);

  return {
    words,
    pagesApprox,
    recommendedCards,
    recommendedMcqs,
  };
}

async function parseStructured({ model, input, schema, name, max_output_tokens }) {
  const resp = await openai.responses.parse({
    model,
    input,
    text: { format: zodTextFormat(schema, name) },
    max_output_tokens,
  });

  if (!resp?.output_parsed) {
    const raw = resp?.output_text ?? "";
    throw new Error(
      `OpenAI returned no parsed output (status=${resp?.status}). Raw(first 400): ${raw.slice(0, 400)}`
    );
  }
  return resp.output_parsed;
}

function uniqByQuestion(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = (it.question ?? "").trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// --------------------
// Main
// --------------------

export async function analyzeExamBlueprint({ text, level = "PASS", language = "fr" }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY manquante dans .env");

  // Blueprint: par défaut FAST (coût bas). Option : override via env.
  const model = process.env.OPENAI_MODEL_BLUEPRINT || MODEL_FAST;

  const clipChars = clampInt(process.env.EXAM_CLIP_CHARS ?? 16000, 2000, 60000);
  const clipped = (text ?? "").slice(0, clipChars);

  const sys = `
Tu es un expert en pédagogie médicale et en préparation concours.
Tu analyses une annale (ou un ensemble de questions) et tu en extrais un **blueprint abstrait**.

Contraintes critiques :
- INTERDICTION de copier/citer une question, une phrase, ou un passage de l'annale.
- Ne reproduis aucune formulation spécifique ; pas de verbatim.
- Pas de suites de mots identiques > 8 mots.
- Tu dois produire des règles générales et des patterns, pas du contenu.
- Réponds STRICTEMENT en JSON (Structured Outputs).

Langue cible: ${language.toUpperCase()}
Niveau: ${level}




`.trim();

  const user = `
Analyse cette annale et produis un blueprint de style.

INPUT:
${clipped}
`.trim();

  const out = await parseStructured({
    model,
    schema: ExamBlueprintOut,
    name: "exam_blueprint",
    max_output_tokens: 1200,
    input: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  });

  return out;
}

export async function generateDeckFromText({
  text,
  level = "PASS",
  cardsCount = 20,
  mcqCount = 15,
  planDays = 7,
  medicalStyle = true,
  language = "fr",
  subject,
  examBlueprint = null,
  examInfluence = "medium",
  sourceFilename,
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY manquante dans .env");

  const maxOut = clampInt(process.env.MAX_OUTPUT_TOKENS ?? 6000, 800, 12000);
  const rawLen = (text ?? "").length;
  const defaultCap = rawLen <= 80000 ? rawLen : 80000;
  const clipChars = clampInt(process.env.DEV_CLIP_CHARS ?? defaultCap, 12000, 250000);

  const cardsTarget = clampInt(cardsCount, 5, 200);
  const mcqTarget = clampInt(mcqCount, 0, 200);
  const daysTarget = clampInt(planDays, 0, 14);

  const clipped = (text ?? "").slice(0, clipChars);
  if ((text ?? "").length > clipChars) {
    console.warn(
      `[generate] WARNING: input clipped (${clipChars}/${(text ?? "").length} chars). Consider raising DEV_CLIP_CHARS or chunking.`
    );
  }

  const modelPicked = pickModel(clipped);
  console.log(
    `[generate] chars=${(text ?? "").length} clipped=${clipped.length} level=${level} cards=${cardsTarget} mcq=${mcqTarget} planDays=${daysTarget}`
  );
  console.log(
    `[router] score=${complexityScore(clipped)} picked=${modelPicked} fast=${MODEL_FAST} smart=${MODEL_SMART}`
  );

  const examInfluenceNorm = ["low", "medium", "high"].includes(String(examInfluence))
    ? String(examInfluence)
    : "medium";

  const examModeSection = examBlueprint
    ? `
MODE CONCOURS (ANNales)

Tu disposes d'un blueprint abstrait d'annales (pas de verbatim).
Influence: ${examInfluenceNorm}

Blueprint:
${JSON.stringify(examBlueprint, null, 2)}

Règles critiques:
- Le CONTENU factuel doit provenir UNIQUEMENT du cours (texte fourni).
- L'annale sert à guider le STYLE (formats, pièges, difficulté), pas à fournir des faits.
- Interdiction de recopier ou paraphraser des questions d'annales.
- Reformule systématiquement ; pas de formulations spécifiques.

Interprétation de l'influence:
- low: n'ajuste que légèrement le format des QCM et la manière de piéger.
- medium: aligne le style et une partie de la distribution (formats/option count).
- high: aligne fortement le style (formats, pièges, niveau), tout en restant fidèle au cours.
`.trim()
    : "";

  // ✅ Prompt renforcé (tuteur médecine + concours + précision) — INCHANGÉ
  const sys = `
Ton objectif est d’aider un étudiant à **réussir un concours exigeant** : tu dois transformer un cours en
flashcards et QCM **hautement pédagogiques**, **précis**, et **fidèles aux attendus**.


PRINCIPES PÉDAGOGIQUES (très important)
- Tu n’es pas un simple résumé : tu es un tuteur. Tu cherches les points à forte valeur d’examen :
 définitions exactes, mécanismes, diagnostics différentiels, pièges classiques, items incontournables.
- Les flashcards doivent être **optimisées pour l’apprentissage actif** :
 - questions courtes mais **très ciblées**
 - Les questions doivent ressembler à des questions d'entraînement : formulation précise, ciblée, "qu’est-ce que je dois savoir ?".
 - une seule idée par carte (atomicité)
 - formulation “comme au concours” : *“Quel est… ?”, “Quels sont les critères… ?”, “Quelle conduite à tenir… ?”*
 - priorité aux éléments discriminants (ce qui fait tomber des points).
 - si chiffres/valeurs clés : donne la valeur exacte (si présente dans le texte)
 - si liste : liste courte, structurée (puces ou mini-énumérations dans la réponse)
 - pas de “ça dépend” flou : tranche quand c’est standard.
 - ton style doit coller à un étudiant en médecine : vocabulaire médical correct,
   concision, rigueur, pas d’invention.
- Les réponses doivent être strictes, exactes, non vagues, orientées "points clés à réciter".
- Si une info n'est PAS présente dans le cours, n'invente pas de détail. 
- Pas de “filler” : chaque carte doit apporter une valeur réelle. 

Règles de contenu :
- Langue: ${language.toUpperCase()}.
- Niveau: ${level}.
- Style: ${medicalStyle ? "médical (cours/concours)" : "général"}.
- Flashcards: courtes, claires, haute précision, sans ambiguité.
- QCM: 3..6 options, une seule bonne réponse, correctIndex cohérent, explication obligatoire.
- plan7d = petites actions de révision (ex: “Revoir X”, “Faire 10 cartes sur Y”, “Refaire QCM sur Z”).
- Le plan doit être réaliste, concret, actionnable.
- Respect STRICT du schéma JSON demandé (Structured Outputs).




${examModeSection}
`.trim();

  // INCHANGÉ
  const userDeck = `
Tu vas générer un deck complet.
Cible:
- ${cardsTarget} flashcards
- ${mcqTarget} QCM
- ${daysTarget} lignes de plan

Si le cours est trop court pour atteindre la cible SANS inventer:
- réduis la quantité plutôt que produire des cartes nulles,
- mais maximise le nombre utile jusqu’à la limite raisonnable.

Ne mets rien d'autre que le JSON attendu.

INPUT:
${JSON.stringify(
    {
      subject: subject ?? null,
      level,
      cardsCount: cardsTarget,
      mcqCount: mcqTarget,
      planDays: daysTarget,
      medicalStyle,
      language,
      text: clipped,
    },
    null,
    2
  )}
`.trim();

  // 1) Génération principale (MODEL ROUTÉ)
  let out = await parseStructured({
    model: modelPicked,
    schema: DeckOut,
    name: "deck",
    max_output_tokens: maxOut,
    input: [
      { role: "system", content: sys },
      { role: "user", content: userDeck },
    ],
  });

  // 2) Top-up (d'abord avec modelPicked)
  let cards = uniqByQuestion(out.cards ?? []);
  let mcqs = uniqByQuestion(out.mcqs ?? []);

  async function topUpCards(usingModel) {
    for (let i = 0; i < 2 && cards.length < cardsTarget; i++) {
      const need = cardsTarget - cards.length;

      const userMoreCards = `
Génère ${need} flashcards supplémentaires (question/answer), SANS doublons.
Interdictions :
- ne répète pas une question existante,
- n’invente pas des détails non présents dans le cours.
Si tu ne peux pas en produire ${need} de qualité, retourne moins.

Questions déjà utilisées:
${JSON.stringify(cards.map((c) => c.question).slice(0, 200), null, 2)}

Texte:
${clipped}
`.trim();

      const more = await parseStructured({
        model: usingModel,
        schema: CardsOnlyOut,
        name: "more_cards",
        max_output_tokens: Math.min(4000, maxOut),
        input: [
          { role: "system", content: sys },
          { role: "user", content: userMoreCards },
        ],
      });

      cards = uniqByQuestion([...cards, ...(more.cards ?? [])]);
    }
  }

  async function topUpMcqs(usingModel) {
    if (mcqTarget <= 0) return;

    for (let i = 0; i < 2 && mcqs.length < mcqTarget; i++) {
      const need = mcqTarget - mcqs.length;

      const userMoreMcq = `
Génère ${need} QCM supplémentaires, SANS doublons.
Rappel: 3..6 options, correctIndex cohérent, explanation obligatoire.
Ne crée pas de QCM hors-sujet. Si tu ne peux pas en produire ${need} de qualité, retourne moins.

QCM déjà utilisés:
${JSON.stringify(mcqs.map((q) => q.question).slice(0, 200), null, 2)}

Texte:
${clipped}
`.trim();

      const more = await parseStructured({
        model: usingModel,
        schema: McqsOnlyOut,
        name: "more_mcqs",
        max_output_tokens: Math.min(5000, maxOut),
        input: [
          { role: "system", content: sys },
          { role: "user", content: userMoreMcq },
        ],
      });

      mcqs = uniqByQuestion([...mcqs, ...(more.mcqs ?? [])]);
    }
  }

  await topUpCards(modelPicked);
  await topUpMcqs(modelPicked);

  // 3) Fallback qualité: si on remplit trop peu, on retente uniquement les top-ups avec MODEL_SMART
  const minFill = Number(process.env.OPENAI_MIN_FILL_RATIO ?? 0.85);
  const cardsOk = cards.length >= Math.ceil(cardsTarget * minFill);
  const mcqsOk = mcqTarget === 0 || mcqs.length >= Math.ceil(mcqTarget * minFill);

  if ((!cardsOk || !mcqsOk) && modelPicked !== MODEL_SMART) {
    console.warn(
      `[router] low fill ratio (cards=${cards.length}/${cardsTarget}, mcqs=${mcqs.length}/${mcqTarget}). Retrying top-ups with ${MODEL_SMART}.`
    );
    await topUpCards(MODEL_SMART);
    await topUpMcqs(MODEL_SMART);
  }

  // --- top up plan (si besoin) — on garde le même modèle que la génération principale
  let plan7d = (out.plan7d ?? []).slice(0, 14);
  if (daysTarget > 0 && plan7d.length < daysTarget) {
    const userPlan = `
Génère un plan de révision de ${daysTarget} lignes (max 14), très concret (actions courtes).
Ne mets rien d'autre que le JSON.

Texte:
${clipped}
`.trim();

    const p = await parseStructured({
      model: modelPicked,
      schema: PlanOnlyOut,
      name: "plan",
      max_output_tokens: 1200,
      input: [
        { role: "system", content: sys },
        { role: "user", content: userPlan },
      ],
    });

    plan7d = (p.plan7d ?? []).slice(0, 14);
  }

  // 4) Normalisation IDs + slicing final (respect des caps)
  const deck = {
    id: nanoid(),
    title: out.title,
    createdAt: Date.now(),
    level,
    subject,
    sourceFilename: sourceFilename ?? null,
    generationMeta: examBlueprint
      ? { examGuided: true, examInfluence: examInfluenceNorm, modelPicked }
      : { examGuided: false, modelPicked },
    cards: cards.slice(0, cardsTarget).map((c) => ({ id: nanoid(), ...c })),
    mcqs: mcqs.slice(0, mcqTarget).map((q) => ({ id: nanoid(), ...q })),
    plan7d: plan7d.slice(0, daysTarget),
  };

  return deck;
}
