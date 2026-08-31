import { NextResponse } from "next/server";
import { createDemoGlobalExam, getDemoExamAttempt, isDemoMode, listDemoGlobalExams } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";
import type { GlobalExamAttempt } from "@/lib/global-content";
import { examWriteSchema, mapAttempt, mapExam, toExamQuestionRows } from "@/lib/global-content-server";

const examSelect = "id,title,description,instructions,created_by_teacher_id,created_by_name,start_at,end_at,duration_minutes,status,created_at,updated_at";

function staff(session: Awaited<ReturnType<typeof getAuthContext>>) {
  return session && (session.role === "teacher" || session.role === "admin") ? session : null;
}

export async function GET() {
  const session = await getAuthContext();
  if (!session || (session.role === "student" && !session.curriculumAccess)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (isDemoMode()) {
    const viewer = { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" } as const;
    const exams = listDemoGlobalExams(viewer).map(({ questions: _questions, ...exam }) => exam);
    return NextResponse.json({ exams, ...(session.role === "student" ? { attempts: exams.map((exam) => getDemoExamAttempt(exam.id, viewer)).filter((attempt): attempt is GlobalExamAttempt => attempt !== null) } : {}) });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.from("global_exams").select(examSelect).order("start_at", { ascending: false });
  if (error) return NextResponse.json({ error: "EXAMS_UNAVAILABLE" }, { status: 500 });
  const exams = (data ?? []).map((row) => mapExam(row, session.userId, session.role === "admin"));
  if (session.role !== "student") return NextResponse.json({ exams });
  const { data: attempts } = await supabase.from("global_exam_attempts").select("id,exam_id,student_id,started_at,effective_expires_at,submitted_at,status,score,max_score,time_taken_seconds");
  return NextResponse.json({ exams, attempts: (attempts ?? []).map((attempt) => mapAttempt(attempt)) });
}

export async function POST(request: Request) {
  const session = staff(await getAuthContext());
  if (!session) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = examWriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  if (isDemoMode()) {
    const exam = createDemoGlobalExam({ ...parsed.data, creator: { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" } });
    return NextResponse.json({ exam }, { status: 201 });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data: exam, error } = await supabase.from("global_exams").insert({
    title: parsed.data.title, description: parsed.data.description ?? null, instructions: parsed.data.instructions ?? null,
    start_at: parsed.data.startAt, end_at: parsed.data.endAt, duration_minutes: parsed.data.durationMinutes,
    created_by_teacher_id: session.userId,
  }).select(examSelect).single();
  if (error || !exam) return NextResponse.json({ error: "EXAM_CREATE_FAILED" }, { status: 400 });
  if (parsed.data.questions.length) {
    const { error: questionError } = await supabase.from("global_exam_questions").insert(toExamQuestionRows(exam.id, parsed.data.questions));
    if (questionError) {
      await supabase.from("global_exams").delete().eq("id", exam.id);
      return NextResponse.json({ error: "EXAM_CREATE_FAILED" }, { status: 500 });
    }
  }
  return NextResponse.json({ exam: mapExam(exam, session.userId, session.role === "admin") }, { status: 201 });
}
