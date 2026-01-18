// src/services/api.ts
import { MOCK_API } from "../config/env";
import * as repo from "../storage/repo";
import type { Deck, GenerationJob, GenerationOptions } from "../types/models";

import * as backend from "./backendApi";
import * as mock from "./mockApi";

// Type minimal compatible avec ton store (selectedFile)
export type SourceFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

export async function startGeneration(file: SourceFile, opts: GenerationOptions): Promise<{ jobId: string }> {
  // ✅ Mock
  if (MOCK_API) {
    // Ton mock save déjà job + deck en local
    const { jobId } = await mock.startGeneration(
      { uri: file.uri, name: file.name, mimeType: file.mimeType, size: file.size },
      opts
    );
    return { jobId };
  }

  // ✅ Backend
  // On envoie un payload "tolérant" (compatible si ton backendApi.createJob attend:
  // - soit { file, opts }
  // - soit { file, level, cardsCount, mcqCount, ... }
  const payload: any = {
    file: { uri: file.uri, name: file.name, mimeType: file.mimeType },

    // version "nouvelle"
    opts,

    // version "ancienne"
    level: opts.level,
    cardsCount: opts.flashcardsCount,
    mcqCount: opts.mcqCount,

    // extras (si tu les utilises côté backend plus tard)
    planDays: opts.planDays,
    medicalStyle: opts.medicalStyle,
    language: opts.language,
    subject: opts.subject,

    autoCounts: opts.autoCounts ?? true,
    intensity: opts.intensity ?? "standard",
  };

  const { jobId } = await (backend as any).createJob(payload);

  // ✅ On stocke immédiatement un job local (utile pour patch deck/subject plus tard)
  const localJob: GenerationJob = {
    jobId,
    status: "processing",
    progress: 0.05,
    createdAt: Date.now(),
    options: opts,
    sourceFilename: file.name,
  };
  await repo.saveJob(localJob);

  return { jobId };
}

export async function getJob(jobId: string): Promise<GenerationJob> {
  // ✅ Mock
  if (MOCK_API) {
    // mock.getJob renvoie un GenerationJob (ou quasi)
    const j = await mock.getJob(jobId);

    // normalise au cas où
    return {
      jobId,
      status: j.status,
      progress: j.progress ?? (j.status === "done" ? 1 : 0.4),
      deckId: (j as any).deckId,
      errorMessage: (j as any).errorMessage ?? (j as any).error,
      createdAt: (j as any).createdAt ?? Date.now(),
      options: (j as any).options,
      sourceFilename: (j as any).sourceFilename,
    };
  }

  // ✅ Backend
  // remote attendu: { status: "processing"|"done"|"error"; deckId?; error? }
  const remote = await backend.getJob(jobId);
  const local = await repo.getJob(jobId);

  const merged: GenerationJob = {
    jobId,
    status: remote.status,
    deckId: remote.deckId ?? local?.deckId,
    progress:
      local?.progress ??
      (remote.status === "done" ? 1 : remote.status === "error" ? 1 : 0.4),
    createdAt: local?.createdAt ?? Date.now(),
    errorMessage: remote.error ?? local?.errorMessage,
    options: local?.options,
    sourceFilename: local?.sourceFilename,
  };

  await repo.saveJob(merged);
  return merged;
}

export async function getDeck(deckId: string): Promise<Deck> {
  // ✅ Mock: le deck est déjà sauvegardé en local par mockApi
  if (MOCK_API) {
    const d = await repo.getDeck(deckId);
    if (!d) throw new Error("Deck introuvable (mock/local).");
    return d;
  }

  // ✅ Backend
  return backend.getDeck(deckId);
}
