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
export async function generateDeckFromText({
  text,
  level = "PASS",
  cardsCount = 20,
  mcqCount = 15,
  planDays = 7,
  medicalStyle = true,
  language = "fr",
  subject,
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY manquante dans .env");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const maxOut = clampInt(process.env.MAX_OUTPUT_TOKENS ?? 6000, 800, 12000);
  const clipChars = clampInt(process.env.DEV_CLIP_CHARS ?? 12000, 2000, 50000);

  const cardsTarget = clampInt(cardsCount, 5, 200);
  const mcqTarget = clampInt(mcqCount, 0, 200);
  const daysTarget = clampInt(planDays, 0, 14);

  const clipped = (text ?? "").slice(0, clipChars);

  console.log(
    `[generate] chars=${(text ?? "").length} clipped=${clipped.length} level=${level} cards=${cardsTarget} mcq=${mcqTarget} planDays=${daysTarget}`
  );

  // ✅ Prompt renforcé (tuteur médecine + concours + précision)
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
`.trim();

  // On donne un contexte clair à l’IA + objectif “exactement N si possible”
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

  // 1) Génération principale
  let out = await parseStructured({
    model,
    schema: DeckOut,
    name: "deck",
    max_output_tokens: maxOut,
    input: [
      { role: "system", content: sys },
      { role: "user", content: userDeck },
    ],
  });

  // 2) Si l’IA n’atteint pas les quantités, on tente 1-2 “top-up” (sans doublons)
  let cards = uniqByQuestion(out.cards ?? []);
  let mcqs = uniqByQuestion(out.mcqs ?? []);

  // --- top up cards
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
      model,
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

  // --- top up mcqs
  if (mcqTarget > 0) {
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
        model,
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

  // --- top up plan (si besoin)
  let plan7d = (out.plan7d ?? []).slice(0, 14);
  if (daysTarget > 0 && plan7d.length < daysTarget) {
    const userPlan = `
Génère un plan de révision de ${daysTarget} lignes (max 14), très concret (actions courtes).
Ne mets rien d'autre que le JSON.

Texte:
${clipped}
`.trim();

    const p = await parseStructured({
      model,
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

  // 3) Normalisation IDs + slicing final (respect des caps)
  const deck = {
    id: nanoid(),
    title: out.title,
    createdAt: Date.now(),
    level,
    subject,
    cards: cards.slice(0, cardsTarget).map((c) => ({ id: nanoid(), ...c })),
    mcqs: mcqs.slice(0, mcqTarget).map((q) => ({ id: nanoid(), ...q })),
    plan7d: plan7d.slice(0, daysTarget),
  };

  return deck;
}
