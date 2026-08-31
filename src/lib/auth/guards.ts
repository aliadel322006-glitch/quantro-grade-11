import { redirect } from "next/navigation";
import { getAuthContext, type AuthContext } from "@/lib/auth/server";
import type { AppLocale } from "@/lib/i18n";

export async function requireStudentCurriculum(locale: AppLocale): Promise<AuthContext> {
  const session = await getAuthContext();
  if (!session) redirect(`/${locale}/auth/student/login`);
  if (session.role !== "student") redirect(`/${locale}/teacher`);
  if (!session.curriculumAccess) redirect(`/${locale}/access-required`);
  return session;
}

export async function requireTeacher(locale: AppLocale): Promise<AuthContext> {
  const session = await getAuthContext();
  if (!session) redirect(`/${locale}/auth/teacher/login`);
  if (session.role !== "teacher" && session.role !== "admin") redirect(`/${locale}/dashboard`);
  return session;
}

export async function requireAdmin(locale: AppLocale): Promise<AuthContext> {
  const session = await getAuthContext();
  if (!session) redirect(`/${locale}/auth/admin/login`);
  if (session.role !== "admin") redirect(`/${locale}/teacher`);
  return session;
}
