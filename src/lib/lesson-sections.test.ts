import { describe, expect, it } from "vitest";
import { part1Lessons } from "@/content/part1-curriculum";

describe("Part 1 lesson flow", () => {
  it("has stable ordered assessment IDs for every lesson", () => {
    for (const lesson of part1Lessons) {
      expect(lesson.practice.map((question) => question.id)).toHaveLength(lesson.unit === 1 ? 10 : 8);
      expect(lesson.quiz).toHaveLength(10);
    }
  });
});
