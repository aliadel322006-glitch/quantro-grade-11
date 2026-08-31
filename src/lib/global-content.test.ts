import { describe, expect, it } from "vitest";
import { effectiveExpiry, examAvailability, hasExpectedMaterialSignature, scoreExam } from "@/lib/global-content";

describe("global teaching content helpers", () => {
  it("accepts only the expected document signatures", () => {
    expect(hasExpectedMaterialSignature("pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(hasExpectedMaterialSignature("ppt", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe(true);
    expect(hasExpectedMaterialSignature("pptx", new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(hasExpectedMaterialSignature("pdf", new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(false);
  });

  it("uses the earlier of individual duration and exam close", () => {
    expect(effectiveExpiry("2026-08-27T10:00:00.000Z", 30, "2026-08-27T11:00:00.000Z")).toBe("2026-08-27T10:30:00.000Z");
    expect(effectiveExpiry("2026-08-27T10:45:00.000Z", 30, "2026-08-27T11:00:00.000Z")).toBe("2026-08-27T11:00:00.000Z");
  });

  it("marks a timed-out in-progress attempt as expired for the interface", () => {
    expect(examAvailability(
      { startAt: "2026-08-27T10:00:00.000Z", endAt: "2026-08-27T12:00:00.000Z" },
      { id: "attempt", examId: "exam", studentId: "student", startedAt: "2026-08-27T10:00:00.000Z", effectiveExpiresAt: "2026-08-27T10:30:00.000Z", submittedAt: null, status: "in_progress", score: null, maxScore: null, timeTakenSeconds: null, answers: [] },
      new Date("2026-08-27T10:31:00.000Z").getTime(),
    )).toBe("expired");
  });

  it("scores answers only against the supplied answer key", () => {
    expect(scoreExam([
      { id: "q1", position: 1, type: "mcq", prompt: { en: "Q", ar: "س" }, choices: [], correctAnswer: "a" },
      { id: "q2", position: 2, type: "true-false", prompt: { en: "Q", ar: "س" }, choices: [], correctAnswer: true },
    ], [{ questionId: "q1", answer: "a" }, { questionId: "q2", answer: false }])).toEqual({ score: 1, maxScore: 2 });
  });
});
