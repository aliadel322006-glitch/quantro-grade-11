import { NextResponse } from "next/server";
import { isDemoMode, listDemoGlobalExams, updateDemoGlobalExam } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";
import { examWriteSchema, mapExam, toExamQuestionRows } from "@/lib/global-content-server";

const examSelect = "id,title,description,instructions,created_by_teacher_id,created_by_name,start_at,end_at,duration_minutes,status,created_at,updated_at";
const questionSelect = "id,position,question_type,prompt,choices,correct_answer";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || (session.role === "student" && !session.curriculumAccess)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (isDemoMode()) {
    const exam = listDemoGlobalExams({ id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" }).find((item) => item.id === id);
    if (!exam) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const canRevealAnswers = exam.canManage;
    return NextResponse.json({ exam: { ...exam, ...(exam.questions ? { questions: exam.questions.map((question) => ({ ...question, ...(canRevealAnswers ? {} : { correctAnswer: undefined }) })) } : {}) } });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data: exam, error } = await supabase.from("global_exams").select(examSelect).eq("id", id).maybeSingle();
  if (error || !exam) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const canManage = session.role === "admin" || exam.created_by_teacher_id === session.userId;
  // Questions are deliberately read through the server: student credentials can never select answer keys.
  const service = await import("@/lib/auth/server").then(({ createServiceSupabase }) => createServiceSupabase());
  if (!service) return NextResponse.json({ error: "EXAM_UNAVAILABLE" }, { status: 503 });
  const { data: questions, error: questionError } = await service.from("global_exam_questions").select(questionSelect).eq("exam_id", id).order("position");
  if (questionError) return NextResponse.json({ error: "EXAM_UNAVAILABLE" }, { status: 500 });
  return NextResponse.json({ exam: mapExam(exam, session.userId, session.role === "admin", questions ?? [], canManage) });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = examWriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  const { id } = await context.params;
  if (isDemoMode()) {
    const exam = updateDemoGlobalExam(id, { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" }, parsed.data);
    return exam ? NextResponse.json({ exam }) : NextResponse.json({ error: "NOT_EDITABLE" }, { status: 409 });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data: current } = await supabase.from("global_exams").select("id,status").eq("id", id).maybeSingle();
  if (!current || current.status !== "draft") return NextResponse.json({ error: "NOT_EDITABLE" }, { status: 409 });
  const { data: exam, error } = await supabase.from("global_exams").update({
    title: parsed.data.title, description: parsed.data.description ?? null, instructions: parsed.data.instructions ?? null,
    start_at: parsed.data.startAt, end_at: parsed.data.endAt, duration_minutes: parsed.data.durationMinutes,
  }).eq("id", id).select(examSelect).single();
  if (error || !exam) return NextResponse.json({ error: "EXAM_UPDATE_FAILED" }, { status: 400 });
  const { error: deleteError } = await supabase.from("global_exam_questions").delete().eq("exam_id", id);
  if (deleteError) return NextResponse.json({ error: "EXAM_UPDATE_FAILED" }, { status: 500 });
  if (parsed.data.questions.length) {
    const { error: questionError } = await supabase.from("global_exam_questions").insert(toExamQuestionRows(id, parsed.data.questions));
    if (questionError) return NextResponse.json({ error: "EXAM_UPDATE_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ exam: mapExam(exam, session.userId, session.role === "admin") });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (isDemoMode()) return NextResponse.json({ error: "NOT_SUPPORTED" }, { status: 405 });
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { error } = await supabase.from("global_exams").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "EXAM_DELETE_FAILED" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
