import type { LocalizedText } from "@/lib/types";

export const MAX_TEACHING_MATERIAL_BYTES = 20 * 1024 * 1024;
export const teachingMaterialTypes = ["pdf", "ppt", "pptx"] as const;
export type TeachingMaterialType = (typeof teachingMaterialTypes)[number];

export type GlobalResource = {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  fileName: string;
  fileType: TeachingMaterialType;
  fileSize: number;
  uploadedByTeacherId: string;
  uploadedByName: string;
  createdAt: string;
  canManage: boolean;
};

export type ExamQuestionType = "mcq" | "true-false";
export type GlobalExamQuestion = {
  id: string;
  position: number;
  type: ExamQuestionType;
  prompt: LocalizedText;
  choices: readonly { id: string; text: LocalizedText }[];
  /** Present only in an owning teacher's draft/edit response. */
  correctAnswer?: string | boolean;
};

export type GlobalExamStatus = "draft" | "published" | "archived";
export type GlobalExamAttemptStatus = "in_progress" | "submitted" | "expired";
export type GlobalExam = {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  instructions?: LocalizedText;
  createdByTeacherId: string;
  createdByName: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: GlobalExamStatus;
  createdAt: string;
  updatedAt: string;
  questions?: readonly GlobalExamQuestion[];
  canManage: boolean;
};

export type GlobalExamAnswer = { questionId: string; answer: string | boolean | null };
export type GlobalExamAttempt = {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  effectiveExpiresAt: string;
  submittedAt: string | null;
  status: GlobalExamAttemptStatus;
  score: number | null;
  maxScore: number | null;
  timeTakenSeconds: number | null;
  answers: readonly GlobalExamAnswer[];
};

export function materialTypeFromName(fileName: string): TeachingMaterialType | null {
  const extension = fileName.split(".").pop()?.toLocaleLowerCase();
  return teachingMaterialTypes.includes(extension as TeachingMaterialType) ? extension as TeachingMaterialType : null;
}

export function materialMimeType(type: TeachingMaterialType) {
  return type === "pdf" ? "application/pdf" : type === "ppt"
    ? "application/vnd.ms-powerpoint"
    : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
}

export function hasExpectedMaterialSignature(type: TeachingMaterialType, bytes: Uint8Array) {
  if (type === "pdf") return [0x25, 0x50, 0x44, 0x46, 0x2d].every((value, index) => bytes[index] === value); // %PDF-
  if (type === "ppt") return [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((value, index) => bytes[index] === value); // OLE compound document
  return [0x50, 0x4b, 0x03, 0x04].every((value, index) => bytes[index] === value); // Office Open XML ZIP package
}

export function effectiveExpiry(startedAt: string, durationMinutes: number, endAt: string) {
  return new Date(Math.min(new Date(startedAt).getTime() + durationMinutes * 60_000, new Date(endAt).getTime())).toISOString();
}

export function examAvailability(exam: Pick<GlobalExam, "startAt" | "endAt">, attempt: GlobalExamAttempt | undefined, now = Date.now()) {
  if (attempt?.status === "submitted") return "submitted" as const;
  if (attempt && (attempt.status === "expired" || new Date(attempt.effectiveExpiresAt).getTime() <= now)) return "expired" as const;
  if (attempt?.status === "in_progress") return "in-progress" as const;
  if (new Date(exam.startAt).getTime() > now) return "upcoming" as const;
  if (new Date(exam.endAt).getTime() <= now) return "missed" as const;
  return "available" as const;
}

export function scoreExam(questions: readonly GlobalExamQuestion[], answers: readonly GlobalExamAnswer[]) {
  const answerByQuestion = new Map(answers.map((item) => [item.questionId, item.answer]));
  const score = questions.reduce((total, question) => total + (answerByQuestion.get(question.id) === question.correctAnswer ? 1 : 0), 0);
  return { score, maxScore: questions.length };
}
