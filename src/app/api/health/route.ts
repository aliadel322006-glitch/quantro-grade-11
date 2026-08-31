import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "quantro-ai", mode: process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase-configured" : "demo" }, { headers: { "Cache-Control": "no-store" } });
}
