import { NextResponse } from "next/server";
import { z } from "zod";
import { ProvisioningError, disableTeacherForAdmin } from "@/lib/auth/staff-provisioning";

const schema = z.object({ action: z.literal("disable") }).strict();

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ teacherId: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { teacherId } = await params;
  try {
    await disableTeacherForAdmin(teacherId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof ProvisioningError ? error.code : "ADMIN_REQUEST_FAILED";
    return NextResponse.json({ error: code }, { status: code === "FORBIDDEN" ? 403 : 503 });
  }
}
