import { NextResponse } from "next/server";
import { createSessionSupabase } from "@/lib/auth/server";

function allowedNext(value: string | null) {
  return value && /^\/(en|ar)\/auth\/teacher\/accept-invitation$/.test(value) ? value : "/en/auth/teacher/login";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = allowedNext(url.searchParams.get("next"));
  if (code) {
    const supabase = await createSessionSupabase();
    const { error } = await supabase?.auth.exchangeCodeForSession(code) ?? { error: new Error("not configured") };
    if (error) return NextResponse.redirect(new URL("/en/auth/teacher/login", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
