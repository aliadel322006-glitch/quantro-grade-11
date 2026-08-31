import { NextResponse } from "next/server";
import { isDemoMode, submitDemoExamAttempt } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";
import { mapAttempt } from "@/lib/global-content-server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || session.role !== "student" || !session.curriculumAccess) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (isDemoMode()) {
    const attempt = submitDemoExamAttempt(id, { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" });
    return attempt ? NextResponse.json({ attempt }) : NextResponse.json({ error: "ATTEMPT_NOT_FOUND" }, { status: 404 });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("submit_global_exam_attempt", { input_exam_id: id });
  if (error || !data) return NextResponse.json({ error: "ATTEMPT_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ attempt: mapAttempt(data) });
}
