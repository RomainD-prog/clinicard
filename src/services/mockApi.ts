import * as repo from "../storage/repo";
import { Deck, GenerationJob, GenerationOptions, PickedFile } from "../types/models";
import { uid } from "../utils/ids";

function buildFakeDeck(file: PickedFile, opts: GenerationOptions): Deck {
  const deckId = uid("d_");
  const cards = Array.from({ length: opts.flashcardsCount }, (_, i) => ({
    id: uid("c_"),
    question: `(${i + 1}) Définis: insuffisance cardiaque (version MVP mock).`,
    answer:
      "Syndrome clinique résultant de l’incapacité du cœur à assurer un débit adéquat aux besoins métaboliques (ou au prix de pressions de remplissage élevées).",
    sourcePage: 12,
    sourceSnippet: "…incapacité du cœur à assurer un débit adéquat…",
  }));

  const labels = ["A", "B", "C", "D", "E"] as const;

  const mcqs = Array.from({ length: opts.mcqCount }, (_, i) => ({
    id: uid("q_"),
    stem:
      `(${i + 1}) Vignette: patient dyspnéique… Quelle proposition est VRAIE ? (mock)`,
    choices: labels.map((l) => ({
      label: l,
      text: `Proposition ${l} (mock)`,
    })),
    correctLabel: "B" as const,
    explanation: "Explication courte (mock) + rappel du mécanisme.",
    sourcePage: 18,
    sourceSnippet: "…dyspnée… BNP…",
  }));

  const plan7d = Array.from({ length: opts.planDays }, (_, i) => {
    const day = i + 1;
    return `Jour ${day} : Réviser ~${Math.ceil(opts.flashcardsCount / opts.planDays)} cartes + 5 QCM.`;
  });

  return {
    id: deckId,
    title: `Deck ${opts.level} — ${file.name}`,
    level: opts.level,
    subject: opts.subject,
    createdAt: Date.now(),
    sourceFilename: file.name,
    cards,
    mcqs,
    plan7d,
  };
}

/**
 * Simule:
 * - startGeneration -> job "processing"
 * - après ~2s -> done + deck sauvegardé local
 */
export async function startGeneration(file: PickedFile, opts: GenerationOptions): Promise<{ jobId: string }> {
  const jobId = uid("j_");
  const job: GenerationJob = {
    jobId,
    status: "processing",
    progress: 0.15,
    createdAt: Date.now(),
    options: opts,                 // ✅ NEW
    sourceFilename: file.name,     // ✅ NEW
  };
  await repo.saveJob(job);

  // async mock progression (non-bloquante)
  setTimeout(async () => {
    await repo.saveJob({ ...job, progress: 0.55 });
  }, 700);

  setTimeout(async () => {
    const deck = buildFakeDeck(file, opts);
    deck.subject = opts.subject;
    await repo.saveDeck(deck);
    const done: GenerationJob = {
      ...job,
      status: "done",
      progress: 1,
      deckId: deck.id,
    };
    await repo.saveJob(done);
  }, 2000);

  return { jobId };
}

export async function getJob(jobId: string): Promise<GenerationJob> {
  const job = await repo.getJob(jobId);
  if (!job) {
    return { jobId, status: "error", progress: 1, errorMessage: "Job introuvable (mock)", createdAt: Date.now() };
  }
  return job;
}
