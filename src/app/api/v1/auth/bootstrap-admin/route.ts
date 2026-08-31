import { NextResponse } from "next/server";
import { z } from "zod";
import { ProvisioningError, bootstrapInitialAdmin } from "@/lib/auth/staff-provisioning";

const schema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/),
  confirmation: z.string().min(1),
  locale: z.enum(["en", "ar"]),
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
    await bootstrapInitialAdmin(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof ProvisioningError ? error.code : "BOOTSTRAP_UNAVAILABLE";
    const status = code === "FORBIDDEN" ? 403 : code === "BOOTSTRAP_UNAVAILABLE" ? 409 : 503;
    return NextResponse.json({ error: "SETUP_UNAVAILABLE" }, { status });
  }
}
