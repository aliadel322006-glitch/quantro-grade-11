import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/server";

export async function GET() {
  const session = await getAuthContext();
  return NextResponse.json({ session }, { headers: { "Cache-Control": "no-store" } });
}
