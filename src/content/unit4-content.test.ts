import { describe, expect, it } from "vitest";
import { part1Lessons } from "@/content/part1-curriculum";

describe("Unit 4 web and media design curriculum", () => {
  const lessons = part1Lessons.filter((lesson) => lesson.unit === 4);

  it("replaces all four placeholder lessons with detailed bilingual learning content", () => {
    expect(lessons.map((lesson) => lesson.number)).toEqual(["4-1", "4-2", "4-3", "4-4"]);
    for (const lesson of lessons) {
      expect(lesson.explanation.length).toBeGreaterThanOrEqual(4);
      expect(lesson.keyTerms.length).toBeGreaterThanOrEqual(6);
      expect(lesson.summaryPoints?.length).toBeGreaterThanOrEqual(5);
      expect(lesson.practice).toHaveLength(8);
      expect(lesson.quiz).toHaveLength(10);
      expect(lesson.activities?.length).toBeGreaterThanOrEqual(3);
      expect(lesson.challenge).toBeDefined();
      expect(lesson.reflection?.transfer.en).not.toHaveLength(0);
      expect(lesson.reflection?.transfer.ar).not.toHaveLength(0);
    }
  });

  it("provides original interaction coverage and a 22-item final review", () => {
    expect(lessons[0]?.activities?.map((activity) => activity.id)).toEqual(["media-direction-sort", "website-balance", "media-purpose-match", "media-plan-builder"]);
    expect(lessons[1]?.activities?.map((activity) => activity.id)).toEqual(["persona-builder", "wireframe-priority", "crap-fixer"]);
    expect(lessons[2]?.activities?.map((activity) => activity.id)).toEqual(["evaluation-sort", "metric-lab", "heuristic-map"]);
    expect(lessons[3]?.activities?.map((activity) => activity.id)).toEqual(["pdca-order", "design-thinking-order", "ab-test-simulator"]);
    expect(lessons[3]?.explanation.map((section) => section.visual)).toContain("unit4-master");
    expect(lessons[3]?.unitReview?.questions).toHaveLength(22);
    expect(lessons[3]?.unitReview?.questions.map((question) => question.kind)).toContain("matching");
    expect(lessons[3]?.unitReview?.questions.map((question) => question.kind)).toContain("ordering");
    expect(lessons[3]?.extraTaskCount).toBe(4);
  });
});
