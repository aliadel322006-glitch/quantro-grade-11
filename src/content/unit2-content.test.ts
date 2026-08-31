import { describe, expect, it } from "vitest";
import { part1Lessons } from "@/content/part1-curriculum";

describe("Unit 2 cybersecurity curriculum", () => {
  const lessons = part1Lessons.filter((lesson) => lesson.unit === 2);

  it("replaces the placeholder lessons with three detailed bilingual cybersecurity lessons", () => {
    expect(lessons.map((lesson) => lesson.number)).toEqual(["2-1", "2-2", "2-3"]);
    for (const lesson of lessons) {
      expect(lesson.explanation.length).toBeGreaterThanOrEqual(4);
      expect(lesson.keyTerms).toHaveLength(6);
      expect(lesson.summaryPoints?.length).toBeGreaterThanOrEqual(5);
      expect(lesson.practice).toHaveLength(8);
      expect(lesson.quiz).toHaveLength(10);
      expect(lesson.activities).toHaveLength(2);
      expect(lesson.challenge).toBeDefined();
      expect(lesson.reflection?.transfer.en).not.toHaveLength(0);
      expect(lesson.reflection?.transfer.ar).not.toHaveLength(0);
    }
  });

  it("includes a complete, original Unit 2 final review after lesson 2-3", () => {
    const finalLesson = lessons.at(-1);
    expect(finalLesson?.unitReview?.questions).toHaveLength(18);
    expect(finalLesson?.unitReview?.questions.map((question) => question.kind)).toContain("matching");
    expect(finalLesson?.unitReview?.questions.map((question) => question.kind)).toContain("ordering");
    expect(finalLesson?.extraTaskCount).toBe(4);
  });
});
