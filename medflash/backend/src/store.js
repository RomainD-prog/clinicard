import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const JOBS_PATH = path.join(DATA_DIR, "jobs.json");
const DECKS_PATH = path.join(DATA_DIR, "decks.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadJSON(file, fallback) {
  try {
    const s = await fs.readFile(file, "utf8");
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

async function saveJSON(file, data) {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

let jobs = [];
let decks = [];

export async function initStore() {
  jobs = await loadJSON(JOBS_PATH, []);
  decks = await loadJSON(DECKS_PATH, []);
}

export async function createJob(job) {
  jobs.unshift(job);
  await saveJSON(JOBS_PATH, jobs);
  return job;
}

export async function updateJob(jobId, patch) {
  const idx = jobs.findIndex((j) => j.jobId === jobId);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], ...patch, updatedAt: Date.now() };
  await saveJSON(JOBS_PATH, jobs);
  return jobs[idx];
}

export function getJob(jobId) {
  return jobs.find((j) => j.jobId === jobId) ?? null;
}

export async function saveDeck(deck) {
  decks.unshift(deck);
  await saveJSON(DECKS_PATH, decks);
  return deck;
}

export function getDeck(deckId) {
  return decks.find((d) => d.id === deckId) ?? null;
}
