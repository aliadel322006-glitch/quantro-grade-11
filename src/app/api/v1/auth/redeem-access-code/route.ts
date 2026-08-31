import { NextResponse } from "next/server";
import { z } from "zod";
import { accessCodeHash, isAccessCodeFormat, normalizeAccessCode } from "@/lib/auth/access-code";
import { createServiceSupabase, getAuthContext } from "@/lib/auth/server";

const schema = z.object({ accessCode: z.string().trim().min(6).max(24) }).strict();

export async function POST(request: Request) {
  const session = await getAuthContext();
  if (!session || session.role !== "student") return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const accessCode = parsed.success ? normalizeAccessCode(parsed.data.accessCode) : "";
  if (!isAccessCodeFormat(accessCode)) return NextResponse.json({ error: "ACCESS_CODE_INVALID" }, { status: 400 });
  if (session.demo) return NextResponse.json({ error: "DEMO_USE_REGISTRATION" }, { status: 400 });
  const service = createServiceSupabase();
  if (!service) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await service.rpc("redeem_curriculum_access_code", { input_code_hash: accessCodeHash(accessCode), target_student_id: session.userId });
  const result = Array.isArray(data) ? data[0] as { status?: string; class_id?: string | null } | undefined : undefined;
  if (error || !result || !["REDEEMED", "ALREADY_REDEEMED"].includes(result.status ?? "")) return NextResponse.json({ error: `ACCESS_CODE_${result?.status ?? "INVALID"}` }, { status: 400 });
  return NextResponse.json({ ok: true, classId: result.class_id ?? null });
}
