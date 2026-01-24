import { ReviewRecord } from "../types/models";

type Grade = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * SM-2-ish:
 * quality: 0..5 (2 = Again, 3 = Hard, 4 = Good, 5 = Easy)
 */
export function updateSM2(rec: ReviewRecord, quality: Grade, now = Date.now()): ReviewRecord {
  let { ease, reps, intervalDays } = rec;

  // Fail resets reps/interval
  if (quality < 3) {
    reps = 0;
    intervalDays = 1;
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 3;
    else intervalDays = Math.round(intervalDays * ease);
  }

  // Ease factor update
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const dueAt = now + intervalDays * 24 * 60 * 60 * 1000;

  return {
    ...rec,
    ease,
    reps,
    intervalDays,
    dueAt,
    lastReviewedAt: now,
  };
}

export function defaultReviewRecord(deckId: string, cardId: string, now = Date.now()): ReviewRecord {
  return {
    deckId,
    cardId,
    dueAt: now, // due now by default (first time)
    intervalDays: 0,
    ease: 2.5,
    reps: 0,
  };
}
