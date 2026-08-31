import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { LocalizedText } from "@/lib/types";
import type { GlobalExam, GlobalExamAttempt, GlobalExamQuestion, GlobalResource } from "@/lib/global-content";

export const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(4000),
  ar: z.string().trim().min(1).max(4000),
}).strict();

const choiceSchema = z.object({
  id: z.string().trim().min(1).max(80),
  text: localizedTextSchema,
}).strict();

export const examQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().min(1).max(200),
  type: z.enum(["mcq", "true-false"]),
  prompt: localizedTextSchema,
  choices: z.array(choiceSchema).max(8),
  correctAnswer: z.union([z.string().trim().min(1).max(80), z.boolean()]),
}).strict().superRefine((value, issue) => {
  if (value.type === "mcq") {
    if (value.choices.length < 2) issue.addIssue({ code: "custom", path: ["choices"], message: "An MCQ needs at least two options." });
    if (typeof value.correctAnswer !== "string" || !value.choices.some((choice) => choice.id === value.correctAnswer)) {
      issue.addIssue({ code: "custom", path: ["correctAnswer"], message: "Choose a valid correct option." });
    }
  }
  if (value.type === "true-false" && typeof value.correctAnswer !== "boolean") {
    issue.addIssue({ code: "custom", path: ["correctAnswer"], message: "True/false questions need a boolean answer." });
  }
});

export const examWriteSchema = z.object({
  title: localizedTextSchema,
  description: localizedTextSchema.optional(),
  instructions: localizedTextSchema.optional(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(1).max(360),
  questions: z.array(examQuestionSchema).max(200),
}).strict().superRefine((value, issue) => {
  if (new Date(value.endAt).getTime() <= new Date(value.startAt).getTime()) {
    issue.addIssue({ code: "custom", path: ["endAt"], message: "End time must be later than start time." });
  }
  const positions = new Set(value.questions.map((question) => question.position));
  if (positions.size !== value.questions.length) issue.addIssue({ code: "custom", path: ["questions"], message: "Question positions must be unique." });
});

export type DbResource = {
  id: string; title: LocalizedText; description: LocalizedText | null; original_file_name: string; file_type: "pdf" | "ppt" | "pptx";
  byte_size: number; uploaded_by_teacher_id: string; uploaded_by_name: string; created_at: string;
};

export function mapResource(row: DbResource, viewerId: string, isAdmin: boolean): GlobalResource {
  return {
    id: row.id, title: row.title, ...(row.description ? { description: row.description } : {}), fileName: row.original_file_name,
    fileType: row.file_type, fileSize: row.byte_size, uploadedByTeacherId: row.uploaded_by_teacher_id,
    uploadedByName: row.uploaded_by_name || "Teacher", createdAt: row.created_at,
    canManage: isAdmin || row.uploaded_by_teacher_id === viewerId,
  };
}

export type DbExam = {
  id: string; title: LocalizedText; description: LocalizedText | null; instructions: LocalizedText | null;
  created_by_teacher_id: string; created_by_name: string; start_at: string; end_at: string; duration_minutes: number;
  status: "draft" | "published" | "archived"; created_at: string; updated_at: string;
};

export type DbQuestion = {
  id: string; position: number; question_type: "mcq" | "true_false"; prompt: LocalizedText;
  choices: { id: string; text: LocalizedText }[]; correct_answer?: string | boolean;
};

export function mapExam(row: DbExam, viewerId: string, isAdmin: boolean, questions?: DbQuestion[], includeAnswers = false): GlobalExam {
  const canManage = isAdmin || row.created_by_teacher_id === viewerId;
  return {
    id: row.id, title: row.title, ...(row.description ? { description: row.description } : {}), ...(row.instructions ? { instructions: row.instructions } : {}),
    createdByTeacherId: row.created_by_teacher_id, createdByName: row.created_by_name || "Teacher", startAt: row.start_at,
    endAt: row.end_at, durationMinutes: row.duration_minutes, status: row.status, createdAt: row.created_at,
    updatedAt: row.updated_at, canManage,
    ...(questions ? { questions: questions.map((question): GlobalExamQuestion => ({
      id: question.id, position: question.position, type: question.question_type === "true_false" ? "true-false" : "mcq",
      prompt: question.prompt, choices: question.choices,
      ...(includeAnswers && canManage && question.correct_answer !== undefined ? { correctAnswer: question.correct_answer } : {}),
    })) } : {}),
  };
}

export type DbAttempt = {
  id: string; exam_id: string; student_id: string; started_at: string; effective_expires_at: string;
  submitted_at: string | null; status: "in_progress" | "submitted" | "expired"; score: number | null; max_score: number | null; time_taken_seconds: number | null;
};

export function mapAttempt(row: DbAttempt, answers: readonly { question_id: string; answer: string | boolean | null }[] = []): GlobalExamAttempt {
  return {
    id: row.id, examId: row.exam_id, studentId: row.student_id, startedAt: row.started_at,
    effectiveExpiresAt: row.effective_expires_at, submittedAt: row.submitted_at, status: row.status,
    score: row.score, maxScore: row.max_score, timeTakenSeconds: row.time_taken_seconds, answers: answers.map((answer) => ({ questionId: answer.question_id, answer: answer.answer })),
  };
}

export function toExamQuestionRows(examId: string, questions: z.infer<typeof examQuestionSchema>[]) {
  return questions.map((question) => ({
    id: question.id ?? randomUUID(), exam_id: examId, position: question.position,
    question_type: question.type === "true-false" ? "true_false" : "mcq", prompt: question.prompt,
    choices: question.choices, correct_answer: question.correctAnswer,
  }));
}
