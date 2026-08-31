import {
  acceptDemoTeacherInvitation,
  bootstrapDemoAdmin,
  demoAdminExists,
  inviteDemoTeacher,
  isDemoMode,
  listDemoTeachers,
  setDemoTeacherDisabled,
} from "@/lib/auth/demo";
import { createServiceSupabase, createSessionSupabase, getAuthContext, type AuthContext } from "@/lib/auth/server";
import type { AppLocale } from "@/lib/i18n";

export type TeacherStatus = "active" | "invited" | "disabled";

export interface TeacherDirectoryEntry {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly status: TeacherStatus;
  readonly createdAt: string;
  readonly invitedAt?: string;
}

export class ProvisioningError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function fail(code: string): never {
  throw new ProvisioningError(code);
}

function serviceOrFail() {
  const service = createServiceSupabase();
  if (!service) fail("PROVISIONING_NOT_CONFIGURED");
  return service;
}

export async function requireAdminApi(): Promise<AuthContext> {
  const session = await getAuthContext();
  if (!session || session.role !== "admin") fail("FORBIDDEN");
  if (!session.demo) {
    const supabase = await createSessionSupabase();
    const { data, error } = await supabase?.auth.mfa.getAuthenticatorAssuranceLevel() ?? { data: null, error: new Error("not configured") };
    if (error || data?.currentLevel !== "aal2") fail("MFA_REQUIRED");
  }
  return session;
}

export async function initialAdminExists() {
  if (isDemoMode()) return demoAdminExists();
  const service = serviceOrFail();
  const { count, error } = await service.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
  if (error) fail("BOOTSTRAP_UNAVAILABLE");
  return (count ?? 0) > 0;
}

export async function bootstrapInitialAdmin(input: { displayName: string; email: string; password: string; locale: AppLocale }) {
  if (isDemoMode()) {
    const session = bootstrapDemoAdmin(input);
    if (!session) fail("BOOTSTRAP_UNAVAILABLE");
    return { demo: true as const };
  }

  const service = serviceOrFail();
  const { data: claim, error: claimError } = await service.rpc("claim_first_admin_bootstrap");
  if (claimError || !claim) fail("BOOTSTRAP_UNAVAILABLE");

  let userId: string | null = null;
  try {
    const { data, error } = await service.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { app_role: "admin", access_disabled: false },
      user_metadata: { display_name: input.displayName, preferred_locale: input.locale },
    });
    if (error || !data.user) fail("BOOTSTRAP_UNAVAILABLE");
    userId = data.user.id;

    const { error: profileError } = await service.from("profiles").upsert({
      user_id: data.user.id,
      role: "admin",
      display_name: input.displayName,
      preferred_locale: input.locale,
    });
    if (profileError) fail("BOOTSTRAP_UNAVAILABLE");

    const { error: completeError } = await service.rpc("complete_first_admin_bootstrap", { claim, admin_user_id: data.user.id });
    if (completeError) fail("BOOTSTRAP_UNAVAILABLE");
    return { demo: false as const };
  } catch (error) {
    if (userId) await service.auth.admin.deleteUser(userId).catch(() => undefined);
    if (error instanceof ProvisioningError) throw error;
    fail("BOOTSTRAP_UNAVAILABLE");
  } finally {
    try { await service.rpc("release_first_admin_bootstrap", { claim }); } catch { /* Reservation expiry also releases abandoned setup. */ }
  }
}

export async function listTeachersForAdmin(): Promise<readonly TeacherDirectoryEntry[]> {
  await requireAdminApi();
  if (isDemoMode()) return listDemoTeachers();

  const service = serviceOrFail();
  const [{ data: profiles, error: profilesError }, { data: usersData, error: usersError }] = await Promise.all([
    service.from("profiles").select("user_id, display_name, created_at").eq("role", "teacher").order("created_at", { ascending: false }),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (profilesError || usersError) fail("DIRECTORY_UNAVAILABLE");
  const users = new Map((usersData?.users ?? []).map((user) => [user.id, user]));
  return (profiles ?? []).map((profile) => {
    const user = users.get(profile.user_id);
    const disabled = user?.app_metadata?.access_disabled === true;
    const invitedAt = typeof (user as { invited_at?: string | null } | undefined)?.invited_at === "string" ? (user as { invited_at: string }).invited_at : undefined;
    const active = Boolean(user?.email_confirmed_at || user?.last_sign_in_at);
    return {
      id: profile.user_id,
      displayName: profile.display_name || user?.email?.split("@")[0] || "Teacher",
      email: user?.email ?? "",
      status: disabled ? "disabled" : active ? "active" : "invited",
      createdAt: profile.created_at,
      ...(invitedAt ? { invitedAt } : {}),
    };
  });
}

export async function inviteTeacher(input: { displayName: string; email: string; locale: AppLocale; origin: string }) {
  await requireAdminApi();
  if (isDemoMode()) {
    const invited = inviteDemoTeacher(input);
    if (!invited) fail("ACCOUNT_EXISTS");
    return {
      id: invited.session.id,
      demoAcceptanceUrl: `${input.origin}/${input.locale}/auth/teacher/accept-invitation?token=${encodeURIComponent(invited.invitationToken)}`,
    };
  }

  const service = serviceOrFail();
  const normalizedEmail = input.email.trim().toLocaleLowerCase();
  const { data: usersData, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) fail("INVITATION_UNAVAILABLE");
  const existing = (usersData.users ?? []).find((user) => user.email?.toLocaleLowerCase() === normalizedEmail);
  if (existing) {
    const { data: profile } = await service.from("profiles").select("role").eq("user_id", existing.id).maybeSingle();
    if (profile?.role === "student") fail("ACCOUNT_EXISTS_STUDENT");
    fail("ACCOUNT_EXISTS");
  }

  const callback = `${input.origin}/auth/callback?next=/${input.locale}/auth/teacher/accept-invitation`;
  const { data, error } = await service.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: callback,
    data: { display_name: input.displayName, preferred_locale: input.locale },
  });
  if (error || !data.user) fail("INVITATION_UNAVAILABLE");

  try {
    const { error: metadataError } = await service.auth.admin.updateUserById(data.user.id, {
      app_metadata: { ...data.user.app_metadata, app_role: "teacher", access_disabled: false },
    });
    if (metadataError) fail("INVITATION_UNAVAILABLE");
    const { error: profileError } = await service.from("profiles").upsert({
      user_id: data.user.id,
      role: "teacher",
      display_name: input.displayName,
      preferred_locale: input.locale,
    });
    if (profileError) fail("INVITATION_UNAVAILABLE");
  } catch (error) {
    await service.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    if (error instanceof ProvisioningError) throw error;
    fail("INVITATION_UNAVAILABLE");
  }
  return { id: data.user.id };
}

export async function disableTeacherForAdmin(teacherId: string) {
  await requireAdminApi();
  if (isDemoMode()) {
    if (!setDemoTeacherDisabled(teacherId, true)) fail("TEACHER_NOT_FOUND");
    return;
  }
  const service = serviceOrFail();
  const { data: profile, error: profileError } = await service.from("profiles").select("role").eq("user_id", teacherId).maybeSingle();
  if (profileError || !profile || profile.role !== "teacher") fail("TEACHER_NOT_FOUND");
  const { data: userData, error: userError } = await service.auth.admin.getUserById(teacherId);
  if (userError || !userData.user) fail("TEACHER_NOT_FOUND");
  const { error } = await service.auth.admin.updateUserById(teacherId, {
    app_metadata: { ...userData.user.app_metadata, app_role: "teacher", access_disabled: true },
    ban_duration: "876000h",
  });
  if (error) fail("TEACHER_UPDATE_UNAVAILABLE");
}

export async function completeTeacherInvitation(input: { password: string; token?: string }) {
  if (isDemoMode()) {
    if (!input.token) fail("INVITATION_INVALID");
    const session = acceptDemoTeacherInvitation(input.token, input.password);
    if (!session) fail("INVITATION_INVALID");
    return { demoSession: session };
  }
  const session = await getAuthContext();
  if (!session || session.role !== "teacher") fail("INVITATION_INVALID");
  const supabase = await createSessionSupabase();
  const { error } = await supabase?.auth.updateUser({ password: input.password }) ?? { error: new Error("not configured") };
  if (error) fail("INVITATION_INVALID");
  return { demoSession: null };
}
