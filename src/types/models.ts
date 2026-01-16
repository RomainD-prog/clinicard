export type StudyLevel = "PASS" | "DFGSM" | "EDN_ECOS" | "AUTRE";

export type GenerationOptions = {
  level: StudyLevel;
  flashcardsCount: number;
  mcqCount: number;
  planDays: number;
  medicalStyle: boolean;
  language: string;
  subject?: string;

  // ✅ NEW
  autoCounts?: boolean; // si true: flashcardsCount/mcqCount = MAX
  intensity?: "light" | "standard" | "max";
};


export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

export type JobStatus = "queued" | "processing" | "done" | "error";

export type GenerationJob = {
  jobId: string;
  status: JobStatus;
  progress: number;      // 0..1
  deckId?: string;
  errorMessage?: string;
  createdAt: number;
  options?: GenerationOptions; 
  sourceFilename?: string;
};

export type Deck = {
  id: string;
  title: string;
  level: StudyLevel;
  subject?: string;
  createdAt: number;
  sourceFilename: string;
  cards: Flashcard[];
  mcqs: MCQ[];
  plan7d: string[]; // simple liste de jours
};

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  sourcePage?: number;
  sourceSnippet?: string;
};

export type MCQChoice = {
  label: "A" | "B" | "C" | "D" | "E";
  text: string;
};

export type MCQ = {
  id: string;
  stem: string; // question/vignette
  choices: MCQChoice[];
  correctLabel: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  sourcePage?: number;
  sourceSnippet?: string;
};

export type ReviewRecord = {
  cardId: string;
  deckId: string;
  dueAt: number;       // timestamp ms
  intervalDays: number; // interval
  ease: number;         // ease factor
  reps: number;         // repetitions
  lastReviewedAt?: number;
};
export type QuizAttempt = {
  id: string;
  deckId: string;
  createdAt: number;
  total: number;
  correct: number;
};
