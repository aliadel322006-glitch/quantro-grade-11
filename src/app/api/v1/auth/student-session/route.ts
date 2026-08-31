import { NextResponse } from "next/server";

/**
 * Retired legacy three-code login endpoint. Kept only to give bookmarked
 * clients a deterministic migration response; it cannot create a session.
 */
export async function POST() {
  return NextResponse.json({ error: "ACCESS_CODE_REGISTRATION_REQUIRED" }, { status: 410 });
}
