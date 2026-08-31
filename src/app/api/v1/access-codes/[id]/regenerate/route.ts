import { NextResponse } from "next/server";
import { accessCodeHash, generateAccessCode } from "@/lib/auth/access-code";
import { isDemoMode, regenerateDemoAccessCode } from "@/lib/auth/demo";
import { createSessionSupabase, getAuthContext } from "@/lib/auth/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  if (isDemoMode()) {
    const code = regenerateDemoAccessCode(id);
    return code ? NextResponse.json({ code }) : NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const code = generateAccessCode();
  const { data, error } = await supabase.from("access_codes").update({ code_hash: accessCodeHash(code), current_uses: 0, active: true, revoked_at: null }).eq("id", id).select("id, code_type, class_id, created_at, expires_at, max_uses, current_uses, active").maybeSingle();
  if (error) return NextResponse.json({ error: "ACCESS_CODE_REGENERATE_FAILED" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ code: { ...data, code } });
}
