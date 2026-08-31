import { NextResponse } from "next/server";
import { z } from "zod";
import { accessCodeHash, isAccessCodeFormat, normalizeAccessCode } from "@/lib/auth/access-code";
import { createDemoSession, isDemoMode, redeemDemoAccessCode } from "@/lib/auth/demo";
import { createServiceSupabase, createSessionSupabase } from "@/lib/auth/server";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(256),
  accessCode: z.string().trim().min(6).max(24),
  locale: z.enum(["en", "ar"]).default("en"),
}).strict();

function codeError(code: string) {
  return NextResponse.json({ error: code }, { status: 400 });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return codeError("REGISTRATION_INVALID");
  const input = { ...parsed.data, accessCode: normalizeAccessCode(parsed.data.accessCode) };
  if (!isAccessCodeFormat(input.accessCode)) return codeError("ACCESS_CODE_INVALID");

  if (isDemoMode()) {
    const redemption = redeemDemoAccessCode({ code: input.accessCode, fullName: input.fullName, email: input.email, password: input.password });
    if ("error" in redemption) return codeError(`ACCESS_CODE_${redemption.error}`);
    const response = NextResponse.json({ session: { role: "student", curriculumAccess: true, demo: true }, classId: redemption.classId }, { status: 201 });
    response.cookies.set("quantro_demo_session", createDemoSession(redemption.session), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    return response;
  }

  const service = createServiceSupabase();
  const browserSession = await createSessionSupabase();
  if (!service || !browserSession) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: input.email.toLocaleLowerCase(), password: input.password, email_confirm: true,
    user_metadata: { display_name: input.fullName, preferred_locale: input.locale },
  });
  if (createError || !created.user) return codeError("REGISTRATION_FAILED");
  const { data: result, error: redeemError } = await service.rpc("redeem_curriculum_access_code", { input_code_hash: accessCodeHash(input.accessCode), target_student_id: created.user.id });
  const redemption = Array.isArray(result) ? result[0] as { status?: string; class_id?: string | null } | undefined : undefined;
  if (redeemError || !redemption || !["REDEEMED", "ALREADY_REDEEMED"].includes(redemption.status ?? "")) {
    await service.auth.admin.deleteUser(created.user.id);
    return codeError(`ACCESS_CODE_${redemption?.status ?? "INVALID"}`);
  }
  const { error: loginError } = await browserSession.auth.signInWithPassword({ email: input.email.toLocaleLowerCase(), password: input.password });
  if (loginError) return NextResponse.json({ error: "REGISTRATION_COMPLETE_SIGN_IN" }, { status: 201 });
  return NextResponse.json({ session: { role: "student", curriculumAccess: true, demo: false }, classId: redemption.class_id ?? null }, { status: 201 });
}
