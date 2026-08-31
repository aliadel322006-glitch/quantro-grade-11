import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteDemoAccessCode, isDemoMode, updateDemoAccessCode } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";

const patchSchema = z.object({ active: z.boolean().optional(), expiresAt: z.string().datetime({ offset: true }).nullable().optional(), maxUses: z.number().int().min(1).max(10000).nullable().optional() }).strict();

async function manager() {
  const session = await getAuthContext();
  return session && (session.role === "teacher" || session.role === "admin") ? session : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await manager()) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  const { id } = await params;
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  const input = parsed.data;
  if (isDemoMode()) {
    const entry = updateDemoAccessCode(id, { active: input.active, expiresAt: input.expiresAt, maxUses: input.maxUses });
    return entry ? NextResponse.json({ code: entry }) : NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const update = { ...(input.active === undefined ? {} : { active: input.active, revoked_at: input.active ? null : new Date().toISOString() }), ...(input.expiresAt === undefined ? {} : { expires_at: input.expiresAt }), ...(input.maxUses === undefined ? {} : { max_uses: input.maxUses }) };
  const { data, error } = await supabase.from("access_codes").update(update).eq("id", id).select("id, code_type, class_id, created_at, expires_at, max_uses, current_uses, active").maybeSingle();
  if (error) return NextResponse.json({ error: "ACCESS_CODE_UPDATE_FAILED" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ code: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await manager()) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  if (isDemoMode()) return deleteDemoAccessCode(id) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { error, count } = await supabase.from("access_codes").delete({ count: "exact" }).eq("id", id);
  if (error) return NextResponse.json({ error: "ACCESS_CODE_DELETE_FAILED" }, { status: 400 });
  return count ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
}
