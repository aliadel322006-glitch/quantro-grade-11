import { NextResponse } from "next/server";
import { z } from "zod";
import { createDemoSession } from "@/lib/auth/demo";
import { ProvisioningError, completeTeacherInvitation } from "@/lib/auth/staff-provisioning";

const schema = z.object({
  password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/),
  confirmation: z.string().min(1),
  token: z.string().min(16).max(128).optional(),
}).strict().refine((value) => value.password === value.confirmation, { path: ["confirmation"] });

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  try {
    const result = await completeTeacherInvitation(parsed.data);
    const response = NextResponse.json({ ok: true });
    if (result.demoSession) {
      response.cookies.set("quantro_demo_session", createDemoSession(result.demoSession), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    }
    return response;
  } catch (error) {
    const code = error instanceof ProvisioningError ? error.code : "INVITATION_INVALID";
    return NextResponse.json({ error: code === "INVITATION_INVALID" ? code : "INVITATION_INVALID" }, { status: 400 });
  }
}
