import { describe, expect, it } from "vitest";
import { part1Lessons } from "@/content/part1-curriculum";

describe("Part 1 bilingual curriculum", () => {
  it("ships all fourteen mapped lessons in the published curriculum", () => {
    expect(part1Lessons).toHaveLength(14);
    expect(part1Lessons.map((lesson) => lesson.number)).toEqual(["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "3-1", "3-2", "3-3", "4-1", "4-2", "4-3", "4-4"]);
    expect(part1Lessons.every((lesson) => lesson.status === "published" && lesson.sourcePages.length > 0)).toBe(true);
  });

  it("provides the same five-step learning rhythm in English and Arabic", () => {
    for (const lesson of part1Lessons) {
      expect(lesson.title.en).not.toHaveLength(0); expect(lesson.title.ar).not.toHaveLength(0);
      expect(lesson.explanation.length).toBeGreaterThanOrEqual(lesson.unit === 1 ? 6 : 3); expect(lesson.keyTerms.length).toBeGreaterThanOrEqual(5);
      expect(lesson.practice).toHaveLength(lesson.unit === 1 ? 10 : 8); expect(lesson.quiz).toHaveLength(10);
      expect(lesson.practice.concat(lesson.quiz).every((question) => question.prompt.en && question.prompt.ar && question.explanation.en && question.explanation.ar && (question.type === "short" || question.type === "cloze" || question.choices?.length === 4 || question.choices?.length === 2))).toBe(true);
    }
  });

  it("adds one distinct Engineer Challenge to every Unit 1 lesson and keeps one final Unit review", () => {
    const unit1 = part1Lessons.filter((lesson) => lesson.unit === 1);
    expect(unit1.map((lesson) => lesson.challenge?.id)).toEqual(["community-center-transform", "revision-recommendations", "city-ai-service", "school-program-ethics"]);
    expect(unit1.every((lesson) => lesson.reflection?.individualPrompt.en && lesson.extraTaskCount === (lesson.slug === "ai-ethics" ? 2 : 1))).toBe(true);
    expect(unit1.slice(0, 3).every((lesson) => lesson.unitReview === undefined)).toBe(true);
    const finalLesson = unit1[3];
    expect(finalLesson?.unitReview?.questions).toHaveLength(16);
    expect(finalLesson?.unitReview?.questions.every((question) => question.prompt.en && question.prompt.ar && question.explanation.en && question.explanation.ar)).toBe(true);
    expect(finalLesson?.explanation.length).toBeGreaterThanOrEqual(6);
  });
});
