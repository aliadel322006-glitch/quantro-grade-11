import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { effectiveExpiry, examAvailability, scoreExam, type GlobalExam, type GlobalExamAnswer, type GlobalExamAttempt, type GlobalExamQuestion, type GlobalResource, type TeachingMaterialType } from "@/lib/global-content";
import type { LocalizedText } from "@/lib/types";

export type DemoRole = "student" | "teacher" | "admin";

export interface DemoSession {
  readonly id: string;
  readonly role: DemoRole;
  readonly displayName: string;
  readonly email?: string;
  readonly curriculumAccess: boolean;
  readonly createdAt: string;
}

export interface DemoAccessCode {
  readonly id: string;
  readonly code: string;
  readonly type: "general" | "class";
  readonly classId: string | null;
  readonly classTitle: string | null;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly maxUses: number | null;
  readonly currentUses: number;
  readonly active: boolean;
  readonly redemptions: readonly { studentName: string; studentEmail: string; redeemedAt: string }[];
}

const DEMO_SESSION_TTL_SECONDS = 60 * 60 * 8;
type DemoAccount = {
  password: string;
  session: DemoSession;
  status?: "active" | "invited" | "disabled";
  invitedAt?: string;
  invitationToken?: string;
};

export interface DemoTeacherSummary {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly status: "active" | "invited" | "disabled";
  readonly createdAt: string;
  readonly invitedAt?: string;
}
type DemoGlobalResource = GlobalResource & { readonly bytes: Uint8Array; readonly mimeType: string };
type DemoClass = {
  readonly id: string;
  readonly title: string;
  readonly teacherId: string;
  readonly latestAnnouncement?: {
    readonly title: LocalizedText;
    readonly body: LocalizedText;
    readonly publishedAt: string;
  };
};
const DEMO_CLASS_11A_ID = "00000000-0000-4000-8000-00000000011a";

function demoClass11AFixture(): DemoClass {
  return {
    id: DEMO_CLASS_11A_ID,
    title: "Class 11-A",
    teacherId: "demo-teacher-1",
    latestAnnouncement: {
      title: { en: "Welcome to Class 11-A", ar: "مرحبًا بكم في الفصل 11-أ" },
      body: {
        en: "Remember to review Lesson 1-1 before our next class.",
        ar: "تذكّروا مراجعة الدرس 1-1 قبل حصتنا القادمة.",
      },
      publishedAt: "2026-08-27T08:00:00.000Z",
    },
  };
}

type DemoStore = {
  accounts: Map<string, DemoAccount>;
  accessCodes: Map<string, DemoAccessCode>;
  classes: Map<string, DemoClass>;
  studentClasses: Map<string, string>;
  resources: Map<string, DemoGlobalResource>;
  exams: Map<string, GlobalExam>;
  attempts: Map<string, GlobalExamAttempt>;
  studentOwners: Map<string, string>;
};

function demoStore(): DemoStore {
  const scope = globalThis as typeof globalThis & { __quantroDemoStore?: DemoStore };
  if (!scope.__quantroDemoStore) {
    const class11A = demoClass11AFixture();
    scope.__quantroDemoStore = {
      accounts: new Map<string, DemoAccount>([
        ["student@quantro.demo", { password: "DemoStudent!26", session: { id: "demo-student-1", role: "student", displayName: "Ahmed Mohamed", email: "student@quantro.demo", curriculumAccess: true, createdAt: "2026-08-26T09:00:00.000Z" } }],
        ["teacher@quantro.demo", { password: "DemoTeacher!26", session: { id: "demo-teacher-1", role: "teacher", displayName: "Ms. Salma Hassan", email: "teacher@quantro.demo", curriculumAccess: false, createdAt: "2026-08-26T09:00:00.000Z" } }],
        ["student2@quantro.demo", { password: "DemoStudent2!26", session: { id: "demo-student-2", role: "student", displayName: "Mariam Hassan", email: "student2@quantro.demo", curriculumAccess: true, createdAt: "2026-08-26T09:00:00.000Z" } }],
        ["teacher2@quantro.demo", { password: "DemoTeacher2!26", session: { id: "demo-teacher-2", role: "teacher", displayName: "Mr. Omar Ali", email: "teacher2@quantro.demo", curriculumAccess: false, createdAt: "2026-08-26T09:00:00.000Z" } }],
      ]),
      accessCodes: new Map<string, DemoAccessCode>(),
      classes: new Map<string, DemoClass>([[class11A.id, class11A]]),
      studentClasses: new Map<string, string>([["demo-student-1", class11A.id]]),
      resources: new Map<string, DemoGlobalResource>(),
      exams: new Map<string, GlobalExam>(),
      attempts: new Map<string, GlobalExamAttempt>(),
      studentOwners: new Map<string, string>([["demo-student-1", "demo-teacher-1"], ["demo-student-2", "demo-teacher-2"]]),
    };
  }
  // Keep hot-reloaded demo processes compatible with stores initialized by an
  // earlier server bundle before class summaries were introduced.
  if (!scope.__quantroDemoStore.classes) {
    const class11A = demoClass11AFixture();
    scope.__quantroDemoStore.classes = new Map([[class11A.id, class11A]]);
  }
  if (!scope.__quantroDemoStore.studentClasses) {
    scope.__quantroDemoStore.studentClasses = new Map([["demo-student-1", DEMO_CLASS_11A_ID]]);
  }
  return scope.__quantroDemoStore;
}

function sameSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function demoSigningKey() {
  // The no-credential demo is deliberately isolated from production. A stable
  // development key makes sessions work across Next.js route/server bundles;
  // a real deployment never enters this branch because Supabase is configured.
  return process.env.DEMO_SESSION_SECRET || "quantro-ai-local-demo-session-key";
}

function sign(value: string) {
  return createHmac("sha256", demoSigningKey()).update(value).digest("base64url");
}

export function isDemoMode() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getDemoSession(token: string | undefined): DemoSession | null {
  if (!token) return null;
  if (token === "student-demo") return demoStore().accounts.get("student@quantro.demo")?.session ?? null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !sameSecret(signature, sign(encoded))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DemoSession & { exp?: number };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    const { exp: _exp, ...session } = payload;
    if (!["student", "teacher", "admin"].includes(session.role) || !session.id || !session.displayName) return null;
    return session;
  } catch {
    return null;
  }
}

export function createDemoSession(session: DemoSession): string {
  const encoded = Buffer.from(JSON.stringify({ ...session, exp: Math.floor(Date.now() / 1000) + DEMO_SESSION_TTL_SECONDS })).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function deleteDemoSession(token: string | undefined) {
  void token;
}

export function authenticateDemoAccount(email: string, password: string, role: DemoRole): DemoSession | null {
  const account = demoStore().accounts.get(email.trim().toLocaleLowerCase());
  const roleAllowed = account?.session.role === role || (role === "teacher" && account?.session.role === "admin");
  if (!account || !roleAllowed || account.status === "invited" || account.status === "disabled" || !sameSecret(password, account.password)) return null;
  return account.session;
}

export function demoAdminExists() {
  return [...demoStore().accounts.values()].some((account) => account.session.role === "admin");
}

export function bootstrapDemoAdmin(input: { displayName: string; email: string; password: string }): DemoSession | null {
  const store = demoStore();
  const email = input.email.trim().toLocaleLowerCase();
  if (demoAdminExists() || store.accounts.has(email)) return null;
  const session: DemoSession = {
    id: `demo-admin-${randomUUID()}`,
    role: "admin",
    displayName: input.displayName.trim(),
    email,
    curriculumAccess: false,
    createdAt: new Date().toISOString(),
  };
  store.accounts.set(email, { password: input.password, session, status: "active" });
  return session;
}

export function listDemoTeachers(): readonly DemoTeacherSummary[] {
  return [...demoStore().accounts.values()]
    .filter((account) => account.session.role === "teacher")
    .map((account) => ({
      id: account.session.id,
      displayName: account.session.displayName,
      email: account.session.email ?? "",
      status: account.status ?? "active",
      createdAt: account.session.createdAt,
      ...(account.invitedAt ? { invitedAt: account.invitedAt } : {}),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function inviteDemoTeacher(input: { displayName: string; email: string }) {
  const store = demoStore();
  const email = input.email.trim().toLocaleLowerCase();
  if (store.accounts.has(email)) return null;
  const invitationToken = randomBytes(24).toString("base64url");
  const now = new Date().toISOString();
  const session: DemoSession = {
    id: `demo-teacher-${randomUUID()}`,
    role: "teacher",
    displayName: input.displayName.trim(),
    email,
    curriculumAccess: false,
    createdAt: now,
  };
  store.accounts.set(email, { password: "", session, status: "invited", invitedAt: now, invitationToken });
  return { session, invitationToken };
}

export function acceptDemoTeacherInvitation(invitationToken: string, password: string): DemoSession | null {
  const account = [...demoStore().accounts.values()].find((candidate) => candidate.invitationToken === invitationToken && candidate.status === "invited");
  if (!account) return null;
  account.password = password;
  account.status = "active";
  account.invitationToken = undefined;
  return account.session;
}

export function setDemoTeacherDisabled(id: string, disabled: boolean) {
  const account = [...demoStore().accounts.values()].find((candidate) => candidate.session.id === id && candidate.session.role === "teacher");
  if (!account) return null;
  account.status = disabled ? "disabled" : "active";
  return account.status;
}

function secureCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = randomBytes(6);
  return `QAI-${[...values].map((value) => alphabet[value % alphabet.length]).join("")}`;
}

export function listDemoAccessCodes() {
  return [...demoStore().accessCodes.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createDemoAccessCode(input: {
  type: "general" | "class";
  classId?: string | null;
  classTitle?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
}) {
  let code = secureCode();
  const accessCodes = demoStore().accessCodes;
  while ([...accessCodes.values()].some((entry) => entry.code === code)) code = secureCode();
  const entry: DemoAccessCode = {
    id: randomUUID(), code, type: input.type,
    classId: input.type === "class" ? input.classId ?? DEMO_CLASS_11A_ID : null,
    classTitle: input.type === "class" ? input.classTitle ?? "Class 11-A" : null,
    createdAt: new Date().toISOString(), expiresAt: input.expiresAt ?? null,
    maxUses: input.maxUses ?? null, currentUses: 0, active: true, redemptions: [],
  };
  accessCodes.set(entry.id, entry);
  if (entry.classId && !demoStore().classes.has(entry.classId)) {
    demoStore().classes.set(entry.classId, {
      id: entry.classId,
      title: entry.classTitle ?? "Class 11-A",
      teacherId: "demo-teacher-1",
    });
  }
  return entry;
}

export function updateDemoAccessCode(id: string, update: Partial<Pick<DemoAccessCode, "active" | "expiresAt" | "maxUses">>) {
  const accessCodes = demoStore().accessCodes;
  const current = accessCodes.get(id);
  if (!current) return null;
  const next = { ...current, ...update };
  accessCodes.set(id, next);
  return next;
}

export function deleteDemoAccessCode(id: string) {
  return demoStore().accessCodes.delete(id);
}

export function regenerateDemoAccessCode(id: string) {
  const current = demoStore().accessCodes.get(id);
  if (!current) return null;
  deleteDemoAccessCode(id);
  return createDemoAccessCode({ type: current.type, classId: current.classId, classTitle: current.classTitle, expiresAt: current.expiresAt, maxUses: current.maxUses });
}

export function redeemDemoAccessCode(input: { code: string; fullName: string; email: string; password: string }): { session: DemoSession; classId: string | null } | { error: "INVALID" | "EXPIRED" | "DISABLED" | "LIMIT_REACHED" } {
  const code = input.code.trim().toLocaleUpperCase();
  const { accessCodes, accounts } = demoStore();
  const entry = [...accessCodes.values()].find((item) => item.code === code);
  if (!entry) return { error: "INVALID" };
  if (!entry.active) return { error: "DISABLED" };
  if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= Date.now()) return { error: "EXPIRED" };
  if (entry.maxUses !== null && entry.currentUses >= entry.maxUses) return { error: "LIMIT_REACHED" };
  const email = input.email.trim().toLocaleLowerCase();
  if (accounts.has(email)) return { error: "INVALID" };
  const session: DemoSession = { id: `demo-${randomUUID()}`, role: "student", displayName: input.fullName.trim(), email, curriculumAccess: true, createdAt: new Date().toISOString() };
  accounts.set(email, { password: input.password, session });
  const next: DemoAccessCode = {
    ...entry,
    currentUses: entry.currentUses + 1,
    redemptions: [...entry.redemptions, { studentName: session.displayName, studentEmail: email, redeemedAt: new Date().toISOString() }],
  };
  accessCodes.set(entry.id, next);
  if (next.classId) {
    demoStore().studentClasses.set(session.id, next.classId);
    const connectedClass = demoStore().classes.get(next.classId);
    if (connectedClass) demoStore().studentOwners.set(session.id, connectedClass.teacherId);
  }
  return { session, classId: next.classId };
}

export function getDemoStudentDashboardClassSummary(studentId: string) {
  const store = demoStore();
  const classId = store.studentClasses.get(studentId);
  if (!classId) return null;
  const connectedClass = store.classes.get(classId);
  if (!connectedClass) return null;
  const teacherName = findDemoAccountName(connectedClass.teacherId);
  return {
    id: connectedClass.id,
    title: connectedClass.title,
    ...(teacherName !== "Student" ? { teacherName } : {}),
    ...(connectedClass.latestAnnouncement ? { latestAnnouncement: connectedClass.latestAnnouncement } : {}),
  };
}

export function listDemoGlobalResources(viewer: DemoSession): readonly GlobalResource[] {
  void viewer;
  return [...demoStore().resources.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ bytes: _bytes, mimeType: _mimeType, ...resource }) => resource);
}

export function createDemoGlobalResource(input: {
  title: LocalizedText; description?: LocalizedText; fileName: string; fileType: TeachingMaterialType;
  fileSize: number; bytes: Uint8Array; mimeType: string; uploader: DemoSession;
}): GlobalResource {
  const now = new Date().toISOString();
  const resource: DemoGlobalResource = {
    id: randomUUID(), title: input.title, ...(input.description ? { description: input.description } : {}),
    fileName: input.fileName, fileType: input.fileType, fileSize: input.fileSize,
    uploadedByTeacherId: input.uploader.id, uploadedByName: input.uploader.displayName,
    createdAt: now, canManage: true, bytes: input.bytes, mimeType: input.mimeType,
  };
  demoStore().resources.set(resource.id, resource);
  return resource;
}

export function readDemoGlobalResource(id: string) {
  return demoStore().resources.get(id) ?? null;
}

export function deleteDemoGlobalResource(id: string, actor: DemoSession) {
  const resource = demoStore().resources.get(id);
  if (!resource || (resource.uploadedByTeacherId !== actor.id && actor.role !== "admin")) return false;
  return demoStore().resources.delete(id);
}

function demoExamForViewer(exam: GlobalExam, viewer: DemoSession): GlobalExam {
  const canManage = viewer.role === "admin" || exam.createdByTeacherId === viewer.id;
  return { ...exam, canManage, ...(exam.questions ? { questions: exam.questions.map((question) => ({ ...question, ...(canManage ? {} : { correctAnswer: undefined }) })) } : {}) };
}

function findDemoAccountName(userId: string) {
  return [...demoStore().accounts.values()].find((account) => account.session.id === userId)?.session.displayName ?? "Student";
}

function mutableDemoAttempt(examId: string, studentId: string) {
  const attempt = [...demoStore().attempts.values()].find((item) => item.examId === examId && item.studentId === studentId);
  if (!attempt || attempt.status !== "in_progress" || new Date(attempt.effectiveExpiresAt).getTime() > Date.now()) return attempt ?? null;
  const exam = demoStore().exams.get(examId);
  if (!exam) return attempt;
  const result = scoreExam(exam.questions ?? [], attempt.answers);
  const expired: GlobalExamAttempt = { ...attempt, status: "expired", submittedAt: attempt.effectiveExpiresAt, timeTakenSeconds: Math.max(0, Math.round((new Date(attempt.effectiveExpiresAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)), ...result };
  demoStore().attempts.set(expired.id, expired);
  return expired;
}

export function listDemoGlobalExams(viewer: DemoSession): readonly GlobalExam[] {
  return [...demoStore().exams.values()]
    .filter((exam) => exam.status === "published" || (viewer.role !== "student" && (viewer.role === "admin" || exam.createdByTeacherId === viewer.id)))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .map((exam) => demoExamForViewer(exam, viewer));
}

type EditableDemoQuestion = Omit<GlobalExamQuestion, "id"> & { id?: string };
type EditableDemoExam = Pick<GlobalExam, "title" | "description" | "instructions" | "startAt" | "endAt" | "durationMinutes"> & { questions?: readonly EditableDemoQuestion[] };

export function createDemoGlobalExam(input: EditableDemoExam & { creator: DemoSession }) {
  const now = new Date().toISOString();
  const exam: GlobalExam = {
    id: randomUUID(), title: input.title, ...(input.description ? { description: input.description } : {}), ...(input.instructions ? { instructions: input.instructions } : {}),
    createdByTeacherId: input.creator.id, createdByName: input.creator.displayName, startAt: input.startAt, endAt: input.endAt,
    durationMinutes: input.durationMinutes, status: "draft", createdAt: now, updatedAt: now, questions: (input.questions ?? []).map((question) => ({ ...question, id: question.id ?? randomUUID() })), canManage: true,
  };
  demoStore().exams.set(exam.id, exam);
  return exam;
}

export function updateDemoGlobalExam(id: string, actor: DemoSession, patch: Partial<EditableDemoExam>) {
  const current = demoStore().exams.get(id);
  if (!current || current.status !== "draft" || (current.createdByTeacherId !== actor.id && actor.role !== "admin")) return null;
  const { questions, ...examPatch } = patch;
  const next: GlobalExam = { ...current, ...examPatch, ...(questions ? { questions: questions.map((question) => ({ ...question, id: question.id ?? randomUUID() })) } : {}), updatedAt: new Date().toISOString() };
  demoStore().exams.set(id, next);
  return demoExamForViewer(next, actor);
}

export function publishDemoGlobalExam(id: string, actor: DemoSession) {
  const current = demoStore().exams.get(id);
  if (!current || current.status !== "draft" || (current.createdByTeacherId !== actor.id && actor.role !== "admin") || !current.questions?.length || new Date(current.endAt).getTime() <= new Date(current.startAt).getTime()) return null;
  const next: GlobalExam = { ...current, status: "published", updatedAt: new Date().toISOString() };
  demoStore().exams.set(id, next);
  return demoExamForViewer(next, actor);
}

export function getDemoExamAttempt(examId: string, student: DemoSession) {
  return mutableDemoAttempt(examId, student.id);
}

export function startDemoExamAttempt(examId: string, student: DemoSession): GlobalExamAttempt | { error: "UNAVAILABLE" | "ALREADY_STARTED" } {
  const exam = demoStore().exams.get(examId);
  if (!exam || exam.status !== "published" || examAvailability(exam, undefined) !== "available") return { error: "UNAVAILABLE" };
  if (getDemoExamAttempt(examId, student)) return { error: "ALREADY_STARTED" };
  const startedAt = new Date().toISOString();
  const attempt: GlobalExamAttempt = { id: randomUUID(), examId, studentId: student.id, startedAt, effectiveExpiresAt: effectiveExpiry(startedAt, exam.durationMinutes, exam.endAt), submittedAt: null, status: "in_progress", score: null, maxScore: null, timeTakenSeconds: null, answers: [] };
  demoStore().attempts.set(attempt.id, attempt);
  return attempt;
}

export function saveDemoExamAnswers(examId: string, student: DemoSession, answers: readonly GlobalExamAnswer[]) {
  const current = getDemoExamAttempt(examId, student);
  const exam = demoStore().exams.get(examId);
  if (!current || !exam || current.status !== "in_progress" || new Date(current.effectiveExpiresAt).getTime() <= Date.now()) return null;
  const allowed = new Set((exam.questions ?? []).map((question) => question.id));
  if (answers.some((answer) => !allowed.has(answer.questionId))) return null;
  const next: GlobalExamAttempt = { ...current, answers: [...answers] };
  demoStore().attempts.set(next.id, next);
  return next;
}

export function submitDemoExamAttempt(examId: string, student: DemoSession) {
  const current = getDemoExamAttempt(examId, student);
  const exam = demoStore().exams.get(examId);
  if (!current || !exam || current.status !== "in_progress") return current ?? null;
  const expired = new Date(current.effectiveExpiresAt).getTime() <= Date.now();
  const result = scoreExam(exam.questions ?? [], current.answers);
  const submittedAt = expired ? current.effectiveExpiresAt : new Date().toISOString();
  const next: GlobalExamAttempt = { ...current, status: expired ? "expired" : "submitted", submittedAt, timeTakenSeconds: Math.max(0, Math.round((new Date(submittedAt).getTime() - new Date(current.startedAt).getTime()) / 1000)), ...result };
  demoStore().attempts.set(next.id, next);
  return next;
}

export function listDemoExamResults(examId: string, teacher: DemoSession) {
  return [...demoStore().attempts.values()]
    .filter((attempt) => attempt.examId === examId && (teacher.role === "admin" || demoStore().studentOwners.get(attempt.studentId) === teacher.id))
    .map((attempt) => ({ ...mutableDemoAttempt(attempt.examId, attempt.studentId)!, studentName: findDemoAccountName(attempt.studentId) }));
}

/** The original no-credential classroom demo remains available for content review. */
export function legacyDemoStudentSession() {
  return demoStore().accounts.get("student@quantro.demo")!.session;
}
