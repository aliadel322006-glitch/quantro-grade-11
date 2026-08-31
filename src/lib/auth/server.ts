import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getDemoSession, isDemoMode, type DemoRole, type DemoSession } from "@/lib/auth/demo";

export type AppRole = DemoRole;

export interface AuthContext {
  readonly userId: string;
  readonly role: AppRole;
  readonly displayName: string;
  readonly email?: string;
  readonly curriculumAccess: boolean;
  readonly demo: boolean;
}

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseConfigured() {
  return configured();
}

export async function createSessionSupabase() {
  if (!configured()) return null;
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => {
        try { entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components may only read cookies. */ }
      },
    },
  });
}

export function createServiceSupabase() {
  if (!configured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

function fromDemo(session: DemoSession): AuthContext {
  return { userId: session.id, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, demo: true };
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  if (isDemoMode()) {
    return getDemoSession(cookieStore.get("quantro_demo_session")?.value ?? cookieStore.get("fm_demo_session")?.value) ? fromDemo(getDemoSession(cookieStore.get("quantro_demo_session")?.value ?? cookieStore.get("fm_demo_session")?.value)!) : null;
  }
  const supabase = await createSessionSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, display_name, curriculum_access_granted_at").eq("user_id", user.id).maybeSingle();
  if (!profile || !["student", "teacher", "admin"].includes(profile.role)) return null;
  const role = profile.role as AppRole;
  const trustedRole = typeof user.app_metadata?.app_role === "string" ? user.app_metadata.app_role : null;
  const disabled = user.app_metadata?.access_disabled === true;

  // A profile is useful application data, but it is not the authority for a
  // staff privilege.  Teacher and administrator sessions must agree with the
  // server-controlled Auth metadata set by the provisioning workflow.  Older
  // student accounts remain valid when they have no staff metadata at all.
  if (role === "teacher" || role === "admin") {
    if (trustedRole !== role || disabled) return null;
  } else if (trustedRole && trustedRole !== "student") {
    return null;
  }
  return {
    userId: user.id,
    role,
    displayName: profile.display_name || user.email?.split("@")[0] || "Quantro user",
    email: user.email,
    curriculumAccess: profile.role !== "student" || Boolean(profile.curriculum_access_granted_at),
    demo: false,
  };
}

export async function writeDemoSession(session: DemoSession) {
  const { createDemoSession } = await import("@/lib/auth/demo");
  return createDemoSession(session);
}
