// src/services/api.ts

import type { GenerationOptions, PickedFile } from "../types/models";
import * as backendApi from "./backendApi";

export async function startGeneration(
  file: PickedFile,
  opts: GenerationOptions,
  examFile?: PickedFile
): Promise<{ jobId: string }> {
  return backendApi.createJob({ file, examFile, opts });
}

export async function getJob(jobId: string) {
  return backendApi.getJob(jobId);
}

export async function getDeck(deckId: string) {
  return backendApi.getDeck(deckId);
}
