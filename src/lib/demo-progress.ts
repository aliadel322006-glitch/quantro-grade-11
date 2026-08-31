"use client";

import type { LocalizedText } from "@/lib/types";

const PROGRESS_KEY = "quantro-ai:progress:v1";
const LEGACY_PROGRESS_KEY = "future-minds:progress:v1";

export type LocalLessonMistake = {
  id: string;
  questionId: string;
  question: LocalizedText;
  learnerAnswer: string;
  correctAnswer: string;
  explanation: LocalizedText;
  source: "practice" | "quiz" | "unit-review";
};
export type LocalProgress = Record<string, {
  completedBlocks: string[];
  updatedAt: string;
  score?: number;
  mistakes?: LocalLessonMistake[];
  unitReview?: { score: number; total: number };
}>;
export type LessonProgressDetails = { mistakes?: LocalLessonMistake[]; unitReview?: { score: number; total: number } };

export function readProgress(): LocalProgress {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY) ?? window.localStorage.getItem(LEGACY_PROGRESS_KEY) ?? "{}";
    const progress = JSON.parse(stored) as LocalProgress;
    if (!window.localStorage.getItem(PROGRESS_KEY) && Object.keys(progress).length) {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
    return progress;
  } catch {
    return {};
  }
}

export function writeLessonProgress(slug: string, completedBlocks: string[], score?: number, details?: LessonProgressDetails) {
  if (typeof window === "undefined") return;
  const progress = readProgress();
  progress[slug] = {
    ...progress[slug],
    completedBlocks: [...new Set(completedBlocks)],
    updatedAt: new Date().toISOString(),
    ...(typeof score === "number" ? { score } : {}),
    ...(details?.mistakes ? { mistakes: details.mistakes } : {}),
    ...(details?.unitReview ? { unitReview: details.unitReview } : {}),
  };
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent("quantro-ai:progress"));
}

export function touchLessonProgress(slug: string) {
  if (typeof window === "undefined") return;
  const progress = readProgress();
  progress[slug] = {
    ...progress[slug],
    completedBlocks: progress[slug]?.completedBlocks ?? [],
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent("quantro-ai:progress"));
}

export function clearDemoProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROGRESS_KEY);
  window.localStorage.removeItem(LEGACY_PROGRESS_KEY);
}
