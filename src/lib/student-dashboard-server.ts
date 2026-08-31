import type { AuthContext } from "@/lib/auth/server";
import { createServiceSupabase, createSessionSupabase } from "@/lib/auth/server";
import { getDemoStudentDashboardClassSummary } from "@/lib/auth/demo";

type DashboardLocalizedText = { en: string; ar: string };

export type StudentDashboardClassSummary = {
  id: string;
  title: string;
  teacherName?: string;
  latestAnnouncement?: {
    title: DashboardLocalizedText;
    body: DashboardLocalizedText;
    publishedAt: string;
  };
};

function localizedText(value: unknown): DashboardLocalizedText | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.en !== "string" || typeof candidate.ar !== "string") return null;
  if (!candidate.en.trim() || !candidate.ar.trim()) return null;
  return { en: candidate.en, ar: candidate.ar };
}

/**
 * Loads the small class snapshot needed by the student home page. Every
 * Membership, class, and announcement queries use the signed-in student's
 * RLS session. After membership is proven, the optional server-only lookup is
 * restricted to that class teacher's display name.
 */
export async function loadStudentDashboardClassSummary(
  session: AuthContext,
): Promise<StudentDashboardClassSummary | null> {
  if (session.role !== "student") return null;

  if (session.demo) return getDemoStudentDashboardClassSummary(session.userId);

  const supabase = await createSessionSupabase();
  if (!supabase) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("class_id")
    .eq("user_id", session.userId)
    .eq("member_role", "student")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.class_id) return null;

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, title, teacher_id")
    .eq("id", membership.class_id)
    .maybeSingle();

  if (classError || !classRow || typeof classRow.id !== "string" || typeof classRow.title !== "string") return null;

  // The membership and class were authorized above through the student's RLS
  // session. A server-only client may now read only that class teacher's public
  // display name; if it is unavailable, the useful class summary still renders.
  const teacherClient = createServiceSupabase() ?? supabase;
  const [teacherResult, announcementResult] = await Promise.all([
    teacherClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", classRow.teacher_id)
      .maybeSingle(),
    supabase
      .from("class_announcements")
      .select("title, body, published_at")
      .eq("class_id", classRow.id)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const teacherName = typeof teacherResult.data?.display_name === "string"
    ? teacherResult.data.display_name.trim()
    : "";
  const announcementTitle = localizedText(announcementResult.data?.title);
  const announcementBody = localizedText(announcementResult.data?.body);
  const publishedAt = announcementResult.data?.published_at;

  return {
    id: classRow.id,
    title: classRow.title,
    ...(teacherName ? { teacherName } : {}),
    ...(!announcementResult.error && announcementTitle && announcementBody && typeof publishedAt === "string"
      ? { latestAnnouncement: { title: announcementTitle, body: announcementBody, publishedAt } }
      : {}),
  };
}
