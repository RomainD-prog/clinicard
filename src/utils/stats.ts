import { Deck, QuizAttempt, ReviewRecord } from "../types/models";

export type DeckReviewStats = {
  totalCards: number;
  learnedCards: number; // reps > 0
  newCards: number;     // aucune review record
  dueCards: number;     // due now
  matureCards: number;  // interval >= 21j (heuristique)
  avgEase: number | null;
  lastQuiz?: QuizAttempt;
  bestQuiz?: QuizAttempt;
};

export function computeDeckStats(params: {
  deck: Deck;
  reviews: ReviewRecord[];
  quizAttempts: QuizAttempt[];
  now?: number;
}): DeckReviewStats {
  const now = params.now ?? Date.now();
  const { deck } = params;

  const byCardId = new Map<string, ReviewRecord>();
  for (const r of params.reviews.filter((r) => r.deckId === deck.id)) {
    byCardId.set(r.cardId, r);
  }

  let learned = 0;
  let fresh = 0;
  let due = 0;
  let mature = 0;

  let easeSum = 0;
  let easeCount = 0;

  for (const c of deck.cards) {
    const rec = byCardId.get(c.id);
    if (!rec) {
      fresh += 1;
      due += 1; // pas encore vue => due
      continue;
    }

    if (rec.reps > 0) learned += 1;
    if (rec.dueAt <= now) due += 1;
    if (rec.intervalDays >= 21) mature += 1;

    easeSum += rec.ease;
    easeCount += 1;
  }

  const attempts = [...params.quizAttempts].sort((a, b) => b.createdAt - a.createdAt);
  const lastQuiz = attempts[0];
  const bestQuiz = [...attempts].sort((a, b) => (b.correct / b.total) - (a.correct / a.total))[0];

  return {
    totalCards: deck.cards.length,
    learnedCards: learned,
    newCards: fresh,
    dueCards: due,
    matureCards: mature,
    avgEase: easeCount ? Math.round((easeSum / easeCount) * 100) / 100 : null,
    lastQuiz,
    bestQuiz,
  };
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
