import { NextResponse } from "next/server";
import { isDemoMode, listDemoExamResults } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";
import { mapAttempt } from "@/lib/global-content-server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (isDemoMode()) return NextResponse.json({ results: listDemoExamResults(id, { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" }) });
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  // RLS limits a teacher to attempts by their own students; it cannot see another teacher's class.
  const { data, error } = await supabase.from("global_exam_attempts").select("id,exam_id,student_id,started_at,effective_expires_at,submitted_at,status,score,max_score,time_taken_seconds,profiles!global_exam_attempts_student_id_fkey(display_name)").eq("exam_id", id).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "RESULTS_UNAVAILABLE" }, { status: 500 });
  return NextResponse.json({ results: (data ?? []).map((row) => ({ ...mapAttempt(row), studentName: row.profiles?.[0]?.display_name ?? "Student" })) });
}
