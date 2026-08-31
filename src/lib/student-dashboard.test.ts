import { describe, expect, it } from "vitest";
import { calculateDashboardMetrics, chooseDashboardRecommendation, dashboardLessonState } from "@/lib/student-dashboard";

const lessons = [
  { slug: "one", unit: 1, practice: Array(10), quiz: Array(10) },
  { slug: "two", unit: 1, practice: Array(8), quiz: Array(10) },
  { slug: "three", unit: 2, practice: Array(8), quiz: Array(10) },
] as const;

describe("student dashboard metrics", () => {
  it("derives totals from each lesson instead of assuming 18 tasks", () => {
    const metrics = calculateDashboardMetrics(lessons, {
      one: { completedBlocks: Array.from({ length: 10 }, (_, index) => `p-${index}`), updatedAt: "2026-08-28T09:00:00Z" },
    });

    expect(metrics.totalTasks).toBe(56);
    expect(metrics.completedTasks).toBe(10);
    expect(metrics.percentage).toBe(18);
    expect(dashboardLessonState({ one: { completedBlocks: Array(20), updatedAt: "now" } }, lessons[0])).toBe("completed");
  });

  it("continues the most recently visited lesson", () => {
    const metrics = calculateDashboardMetrics(lessons, {
      one: { completedBlocks: ["a"], updatedAt: "2026-08-27T09:00:00Z" },
      two: { completedBlocks: [], updatedAt: "2026-08-28T09:00:00Z" },
    });

    expect(metrics.continueLesson?.slug).toBe("two");
  });
});

describe("student dashboard recommendation", () => {
  it("prioritizes real quiz mistakes", () => {
    const progress = { one: { completedBlocks: Array(20), updatedAt: "2026-08-28T09:00:00Z", score: 7 } };
    expect(chooseDashboardRecommendation(lessons, progress, lessons[0])).toEqual({ kind: "review-mistakes", lesson: lessons[0], mistakes: 3 });
  });

  it("suggests the next lesson after a completed stopping point", () => {
    const progress = { one: { completedBlocks: Array(20), updatedAt: "2026-08-28T09:00:00Z", score: 10 } };
    expect(chooseDashboardRecommendation(lessons, progress, lessons[0])).toEqual({ kind: "start-next", lesson: lessons[1] });
  });

  it("hides a recommendation that would duplicate unfinished work", () => {
    const progress = { one: { completedBlocks: ["a"], updatedAt: "2026-08-28T09:00:00Z" } };
    expect(chooseDashboardRecommendation(lessons, progress, lessons[0])).toBeNull();
  });
});
