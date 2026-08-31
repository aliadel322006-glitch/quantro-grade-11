import { NextResponse } from "next/server";
import { getAuthContext, createSessionSupabase } from "@/lib/auth/server";

export async function GET() {
  const session = await getAuthContext();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (session.demo) return NextResponse.json({ classes: [{ id: "00000000-0000-4000-8000-00000000011a", title: "Class 11-A", code: "QAI11A26" }] });
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.from("classes").select("id, title, code").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "CLASSES_UNAVAILABLE" }, { status: 500 });
  return NextResponse.json({ classes: data });
}
