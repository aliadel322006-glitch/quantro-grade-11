import { NextResponse } from "next/server";
import { z } from "zod";
import { ProvisioningError, inviteTeacher, listTeachersForAdmin } from "@/lib/auth/staff-provisioning";

const inviteSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(320),
  locale: z.enum(["en", "ar"]),
}).strict();

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function errorResponse(error: unknown) {
  const code = error instanceof ProvisioningError ? error.code : "ADMIN_REQUEST_FAILED";
  const status = code === "FORBIDDEN" ? 403 : code.startsWith("ACCOUNT_EXISTS") ? 409 : 503;
  return NextResponse.json({ error: code }, { status });
}

export async function GET() {
  try {
    return NextResponse.json({ teachers: await listTeachersForAdmin() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 403 });
  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  try {
    const origin = new URL(request.url).origin;
    return NextResponse.json(await inviteTeacher({ ...parsed.data, origin }), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
