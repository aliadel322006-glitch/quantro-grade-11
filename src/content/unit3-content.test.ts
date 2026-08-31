import { describe, expect, it } from "vitest";
import { part1Lessons } from "@/content/part1-curriculum";

describe("Unit 3 web applications curriculum", () => {
  const lessons = part1Lessons.filter((lesson) => lesson.unit === 3);

  it("replaces the placeholder lessons with three detailed bilingual web-application lessons", () => {
    expect(lessons.map((lesson) => lesson.number)).toEqual(["3-1", "3-2", "3-3"]);
    for (const lesson of lessons) {
      expect(lesson.explanation.length).toBeGreaterThanOrEqual(4);
      expect(lesson.keyTerms.length).toBeGreaterThanOrEqual(5);
      expect(lesson.summaryPoints?.length).toBeGreaterThanOrEqual(5);
      expect(lesson.practice).toHaveLength(8);
      expect(lesson.quiz).toHaveLength(10);
      expect(lesson.activities?.length).toBeGreaterThanOrEqual(2);
      expect(lesson.challenge).toBeDefined();
      expect(lesson.reflection?.transfer.en).not.toHaveLength(0);
      expect(lesson.reflection?.transfer.ar).not.toHaveLength(0);
    }
  });

  it("includes original learning interactions and an 18-item Unit 3 review", () => {
    expect(lessons[0]?.activities?.map((activity) => activity.id)).toEqual(["web-tier-flow", "tier-classify"]);
    expect(lessons[1]?.activities?.map((activity) => activity.id)).toEqual(["client-server-flow", "get-post-sort", "status-simulator", "api-json-order"]);
    expect(lessons[2]?.activities?.map((activity) => activity.id)).toEqual(["frontend-layers", "semantic-map", "responsive-simulator"]);
    expect(lessons[2]?.explanation.map((section) => section.visual)).toContain("master-flow");
    expect(lessons[2]?.unitReview?.questions).toHaveLength(18);
    expect(lessons[2]?.unitReview?.questions.map((question) => question.kind)).toContain("matching");
    expect(lessons[2]?.unitReview?.questions.map((question) => question.kind)).toContain("ordering");
    expect(lessons[2]?.extraTaskCount).toBe(4);
  });
});
