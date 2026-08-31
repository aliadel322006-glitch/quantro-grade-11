import type { LocalProgress } from "@/lib/demo-progress";

export type DashboardLessonLike = {
  readonly slug: string;
  readonly unit: number;
  readonly practice: readonly unknown[];
  readonly quiz: readonly unknown[];
  readonly extraTaskCount?: number;
};

export type DashboardLessonState = "completed" | "in-progress" | "not-started";

export function taskCountFor(lesson: DashboardLessonLike) {
  return lesson.practice.length + lesson.quiz.length + (lesson.extraTaskCount ?? 0);
}

export function completedTaskCount(progress: LocalProgress, lesson: DashboardLessonLike) {
  return Math.min(progress[lesson.slug]?.completedBlocks.length ?? 0, taskCountFor(lesson));
}

export function dashboardLessonState(progress: LocalProgress, lesson: DashboardLessonLike): DashboardLessonState {
  const completed = completedTaskCount(progress, lesson);
  return completed >= taskCountFor(lesson) ? "completed" : completed > 0 ? "in-progress" : "not-started";
}

function mostRecent<T extends DashboardLessonLike>(lessons: readonly T[], progress: LocalProgress) {
  return lessons
    .filter((lesson) => Boolean(progress[lesson.slug]?.updatedAt))
    .sort((left, right) => (progress[right.slug]?.updatedAt ?? "").localeCompare(progress[left.slug]?.updatedAt ?? ""))[0];
}

export function calculateDashboardMetrics<T extends DashboardLessonLike>(lessons: readonly T[], progress: LocalProgress) {
  const completed = lessons.filter((lesson) => dashboardLessonState(progress, lesson) === "completed");
  const inProgress = lessons.filter((lesson) => dashboardLessonState(progress, lesson) === "in-progress");
  const notStartedLessons = lessons.filter((lesson) => dashboardLessonState(progress, lesson) === "not-started");
  const completedTasks = lessons.reduce((total, lesson) => total + completedTaskCount(progress, lesson), 0);
  const totalTasks = lessons.reduce((total, lesson) => total + taskCountFor(lesson), 0);
  const continueLesson = mostRecent(lessons, progress) ?? notStartedLessons[0] ?? lessons.at(-1);

  return {
    completed,
    inProgress,
    notStarted: notStartedLessons.length,
    completedTasks,
    totalTasks,
    percentage: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    continueLesson,
  };
}

export type DashboardRecommendation<T extends DashboardLessonLike> =
  | { readonly kind: "review-mistakes"; readonly lesson: T; readonly mistakes: number }
  | { readonly kind: "start-next"; readonly lesson: T }
  | { readonly kind: "review-curriculum" }
  | null;

export function chooseDashboardRecommendation<T extends DashboardLessonLike>(
  lessons: readonly T[],
  progress: LocalProgress,
  continueLesson: T | undefined,
): DashboardRecommendation<T> {
  const weakLessons = lessons
    .flatMap((lesson) => {
      const recordedMistakes = progress[lesson.slug]?.mistakes?.length;
      if (recordedMistakes) return [{ lesson, mistakes: recordedMistakes, updatedAt: progress[lesson.slug]?.updatedAt ?? "" }];
      const score = progress[lesson.slug]?.score;
      return typeof score === "number" && score < lesson.quiz.length
        ? [{ lesson, mistakes: lesson.quiz.length - score, updatedAt: progress[lesson.slug]?.updatedAt ?? "" }]
        : [];
    })
    .sort((left, right) => right.mistakes - left.mistakes || right.updatedAt.localeCompare(left.updatedAt));

  if (weakLessons[0]) {
    return { kind: "review-mistakes", lesson: weakLessons[0].lesson, mistakes: weakLessons[0].mistakes };
  }

  if (!continueLesson) return null;
  if (dashboardLessonState(progress, continueLesson) === "completed") {
    const currentIndex = lessons.findIndex((lesson) => lesson.slug === continueLesson.slug);
    const nextLesson = [...lessons.slice(currentIndex + 1), ...lessons.slice(0, currentIndex)]
      .find((lesson) => dashboardLessonState(progress, lesson) === "not-started");
    if (nextLesson) return { kind: "start-next", lesson: nextLesson };
    return { kind: "review-curriculum" };
  }

  // With no submitted weak quiz and unfinished work, Continue Learning already
  // represents the useful action. Hiding the second card avoids duplication.
  return null;
}
