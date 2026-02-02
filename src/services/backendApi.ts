// src/services/backendApi.ts
import { API_BASE_URL } from "../config/env";
import type { GenerationOptions, PickedFile } from "../types/models";

const BASE = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

async function readError(r: Response) {
  const ct = r.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const j = await r.json();
      return typeof (j as any)?.error === "string" ? (j as any).error : JSON.stringify(j);
    }
    return await r.text();
  } catch {
    return "unknown_error";
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function createJob(params: {
  file: PickedFile;
  examFile?: PickedFile;
  opts: GenerationOptions;
}) {
  const form = new FormData();

  form.append("level", params.opts.level);
  form.append("cardsCount", String(params.opts.flashcardsCount));
  form.append("mcqCount", String(params.opts.mcqCount));
  form.append("planDays", String(params.opts.planDays));
  form.append("medicalStyle", String(params.opts.medicalStyle));
  form.append("language", params.opts.language);

  if (params.opts.subject) form.append("subject", params.opts.subject);

  // ✅ nouveaux champs (si présents)
  if (typeof (params.opts as any).autoCounts === "boolean") {
    form.append("autoCounts", String((params.opts as any).autoCounts));
  }
  if (typeof (params.opts as any).intensity === "string") {
    form.append("intensity", String((params.opts as any).intensity)); // "light" | "standard" | "max"
  }

  // ✅ Mode concours (annales)
  if (typeof (params.opts as any).examGuided === "boolean") {
    form.append("examGuided", String((params.opts as any).examGuided));
  }
  if (typeof (params.opts as any).examInfluence === "string") {
    form.append("examInfluence", String((params.opts as any).examInfluence)); // "low" | "medium" | "high"
  }

  form.append("file", {
    uri: params.file.uri,
    name: params.file.name,
    type: params.file.mimeType,
  } as any);

  // Champ optionnel: annale (PDF)
  if (params.examFile?.uri) {
    form.append("exam", {
      uri: params.examFile.uri,
      name: params.examFile.name,
      type: params.examFile.mimeType,
    } as any);
  }

  // POST peut prendre du temps avec l\x27IA → timeout généreux
  const r = await fetchWithTimeout(`${BASE}/v1/jobs`, { method: "POST", body: form }, 90_000); // 90 secondes

  if (!r.ok) throw new Error(await readError(r));
  return r.json() as Promise<{ jobId: string; status: string }>;
}

export async function getJob(jobId: string) {
  const r = await fetchWithTimeout(`${BASE}/v1/jobs/${jobId}`, {}, 15_000);
  if (!r.ok) throw new Error(await readError(r));
  return r.json() as Promise<{ status: "processing" | "done" | "error"; deckId?: string; error?: string }>; 
}

export async function getDeck(deckId: string) {
  const r = await fetchWithTimeout(`${BASE}/v1/decks/${deckId}`, {}, 20_000);
  if (!r.ok) throw new Error(await readError(r));
  return r.json();
}

// helper: poll
export async function waitForJob(jobId: string, opts?: { timeoutMs?: number; intervalMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 180_000;
  const intervalMs = opts?.intervalMs ?? 1200;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const j = await getJob(jobId);
    if (j.status === "done") return j;
    if (j.status === "error") throw new Error(j.error ?? "job_error");
    await new Promise((r2) => setTimeout(r2, intervalMs));
  }
  throw new Error("timeout_job");
}
