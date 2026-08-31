import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode, saveDemoExamAnswers } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";
import { mapAttempt } from "@/lib/global-content-server";

const answersSchema = z.object({ answers: z.array(z.object({ questionId: z.string().uuid(), answer: z.union([z.string().max(80), z.boolean(), z.null()]) }).strict()).max(200) }).strict();

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || session.role !== "student" || !session.curriculumAccess) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = answersSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  const { id } = await context.params;
  if (isDemoMode()) {
    const attempt = saveDemoExamAnswers(id, { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" }, parsed.data.answers);
    return attempt ? NextResponse.json({ attempt }) : NextResponse.json({ error: "ATTEMPT_CLOSED" }, { status: 409 });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("save_global_exam_answers", { input_exam_id: id, input_answers: parsed.data.answers });
  if (error || !data) return NextResponse.json({ error: "ATTEMPT_CLOSED" }, { status: 409 });
  const attempt = mapAttempt(data);
  return attempt.status === "in_progress" ? NextResponse.json({ attempt }) : NextResponse.json({ error: "ATTEMPT_CLOSED", attempt }, { status: 409 });
}
