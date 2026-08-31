import { NextResponse } from "next/server";
import { z } from "zod";
import { accessCodeHash, generateAccessCode } from "@/lib/auth/access-code";
import { createDemoAccessCode, isDemoMode, listDemoAccessCodes } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";

const createSchema = z.object({
  type: z.enum(["general", "class"]),
  classId: z.string().uuid().nullable().optional(),
  classTitle: z.string().trim().min(1).max(120).nullable().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  maxUses: z.number().int().min(1).max(10000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.type === "class" && !value.classId) context.addIssue({ code: "custom", path: ["classId"], message: "Required for class codes." });
  if (value.type === "general" && value.classId) context.addIssue({ code: "custom", path: ["classId"], message: "General codes do not have a class." });
});

async function manager() {
  const session = await getAuthContext();
  return session && (session.role === "teacher" || session.role === "admin") ? session : null;
}

export async function GET() {
  const session = await manager();
  if (!session) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (isDemoMode()) return NextResponse.json({ codes: listDemoAccessCodes().map(({ code, ...entry }) => ({ ...entry, code, redemptions: entry.redemptions })) });
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.from("access_codes").select("id, code_type, class_id, created_at, expires_at, max_uses, current_uses, active, revoked_at, access_code_redemptions(student_id, redeemed_at, class_id)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "ACCESS_CODES_UNAVAILABLE" }, { status: 500 });
  return NextResponse.json({ codes: data.map((entry) => ({ id: entry.id, type: entry.code_type, classId: entry.class_id, createdAt: entry.created_at, expiresAt: entry.expires_at, maxUses: entry.max_uses, currentUses: entry.current_uses, active: entry.active, redemptions: entry.access_code_redemptions ?? [] })) });
}

export async function POST(request: Request) {
  const session = await manager();
  if (!session) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  const input = parsed.data;
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) return NextResponse.json({ error: "EXPIRY_IN_PAST" }, { status: 400 });
  if (isDemoMode()) {
    const entry = createDemoAccessCode({ type: input.type, classId: input.classId, classTitle: input.classTitle, expiresAt: input.expiresAt, maxUses: input.maxUses });
    return NextResponse.json({ code: entry }, { status: 201 });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const code = generateAccessCode();
  const { data, error } = await supabase.from("access_codes").insert({ code_hash: accessCodeHash(code), code_type: input.type, class_id: input.type === "class" ? input.classId : null, expires_at: input.expiresAt ?? null, max_uses: input.maxUses ?? null }).select("id, code_type, class_id, created_at, expires_at, max_uses, current_uses, active").single();
  if (error || !data) return NextResponse.json({ error: "ACCESS_CODE_CREATE_FAILED" }, { status: 400 });
  return NextResponse.json({ code: { id: data.id, code, type: data.code_type, classId: data.class_id, createdAt: data.created_at, expiresAt: data.expires_at, maxUses: data.max_uses, currentUses: data.current_uses, active: data.active, redemptions: [] } }, { status: 201 });
}
