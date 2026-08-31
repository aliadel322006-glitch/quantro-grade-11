import { NextResponse } from "next/server";
import { isDemoMode, publishDemoGlobalExam } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";
import { mapExam } from "@/lib/global-content-server";

const examSelect = "id,title,description,instructions,created_by_teacher_id,created_by_name,start_at,end_at,duration_minutes,status,created_at,updated_at";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (isDemoMode()) {
    const exam = publishDemoGlobalExam(id, { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" });
    return exam ? NextResponse.json({ exam }) : NextResponse.json({ error: "PUBLISHING_NOT_READY" }, { status: 409 });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data: current } = await supabase.from("global_exams").select("id,status,start_at,end_at").eq("id", id).maybeSingle();
  if (!current || current.status !== "draft" || new Date(current.end_at).getTime() <= new Date(current.start_at).getTime()) return NextResponse.json({ error: "PUBLISHING_NOT_READY" }, { status: 409 });
  const { count } = await supabase.from("global_exam_questions").select("id", { count: "exact", head: true }).eq("exam_id", id);
  if (!count) return NextResponse.json({ error: "PUBLISHING_NOT_READY" }, { status: 409 });
  const { data: exam, error } = await supabase.from("global_exams").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id).select(examSelect).single();
  if (error || !exam) return NextResponse.json({ error: "PUBLISH_FAILED" }, { status: 400 });
  return NextResponse.json({ exam: mapExam(exam, session.userId, session.role === "admin") });
}
