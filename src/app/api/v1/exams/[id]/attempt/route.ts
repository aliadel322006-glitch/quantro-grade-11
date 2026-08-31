import { NextResponse } from "next/server";
import { getDemoExamAttempt, isDemoMode, startDemoExamAttempt } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";
import { mapAttempt } from "@/lib/global-content-server";

function student(session: Awaited<ReturnType<typeof getAuthContext>>) {
  return session?.role === "student" && session.curriculumAccess ? session : null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = student(await getAuthContext());
  if (!session) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (isDemoMode()) {
    const attempt = getDemoExamAttempt(id, { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" });
    return NextResponse.json({ attempt });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data: attempt, error } = await supabase.rpc("read_global_exam_attempt", { input_exam_id: id });
  if (error || !attempt) return NextResponse.json({ attempt: null });
  const { data: answers } = await supabase.from("global_exam_answers").select("question_id,answer").eq("attempt_id", attempt.id);
  return NextResponse.json({ attempt: mapAttempt(attempt, answers ?? []) });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = student(await getAuthContext());
  if (!session) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (isDemoMode()) {
    const result = startDemoExamAttempt(id, { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" });
    return "error" in result ? NextResponse.json({ error: result.error }, { status: 409 }) : NextResponse.json({ attempt: result }, { status: 201 });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("start_global_exam_attempt", { input_exam_id: id });
  if (error || !data) return NextResponse.json({ error: error?.code === "23505" ? "ALREADY_STARTED" : "UNAVAILABLE" }, { status: 409 });
  return NextResponse.json({ attempt: mapAttempt(data) }, { status: 201 });
}
