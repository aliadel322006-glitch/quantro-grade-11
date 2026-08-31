import { NextResponse } from "next/server";
import { deleteDemoSession, isDemoMode } from "@/lib/auth/demo";
import { createSessionSupabase } from "@/lib/auth/server";

export async function POST() {
  if (isDemoMode()) {
    const { cookies } = await import("next/headers");
    deleteDemoSession((await cookies()).get("quantro_demo_session")?.value);
  } else {
    const supabase = await createSessionSupabase();
    await supabase?.auth.signOut();
  }
  const response = NextResponse.json({ ok: true, purgeOfflineStorage: true });
  response.cookies.set("quantro_demo_session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set("fm_demo_session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
