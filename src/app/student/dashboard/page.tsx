import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/server";

export default async function StudentDashboardAlias({ searchParams }: { searchParams: Promise<{ locale?: string }> }) {
  const requestedLocale = (await searchParams).locale;
  const locale = requestedLocale === "ar" ? "ar" : "en";
  const session = await getAuthContext();
  if (!session) redirect(`/${locale}/auth/student/login`);
  if (session.role !== "student") redirect("/teacher/dashboard");
  redirect(session.curriculumAccess ? `/${locale}/dashboard` : `/${locale}/access-required`);
}
