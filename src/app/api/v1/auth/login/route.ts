import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDemoAccount, createDemoSession, isDemoMode } from "@/lib/auth/demo";
import { createSessionSupabase } from "@/lib/auth/server";

const schema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(256),
  role: z.enum(["student", "teacher", "admin"]),
}).strict();

function invalid() {
  return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid();
  const { email, password, role } = parsed.data;
  if (isDemoMode()) {
    const session = authenticateDemoAccount(email, password, role);
    if (!session) return invalid();
    const response = NextResponse.json({ session: { role: session.role, curriculumAccess: session.curriculumAccess, demo: true } });
    response.cookies.set("quantro_demo_session", createDemoSession(session), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    return response;
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return invalid();
  const { data: profile } = await supabase.from("profiles").select("role, curriculum_access_granted_at").eq("user_id", data.user.id).maybeSingle();
  const trustedRole = typeof data.user.app_metadata?.app_role === "string" ? data.user.app_metadata.app_role : null;
  const disabled = data.user.app_metadata?.access_disabled === true;
  const staffLogin = role === "teacher" && (profile?.role === "teacher" || profile?.role === "admin");
  const validRole = role === "student"
    ? profile?.role === "student" && (!trustedRole || trustedRole === "student")
    : role === "admin"
      ? profile?.role === "admin" && trustedRole === "admin" && !disabled
      : staffLogin && trustedRole === profile?.role && !disabled;
  if (!profile || !validRole) {
    await supabase.auth.signOut();
    return invalid();
  }
  return NextResponse.json({ session: { role: profile.role, curriculumAccess: profile.role !== "student" || Boolean(profile.curriculum_access_granted_at), demo: false } });
}
