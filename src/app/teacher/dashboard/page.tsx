import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/server";

export default async function TeacherDashboardAlias({ searchParams }: { searchParams: Promise<{ locale?: string }> }) {
  const requestedLocale = (await searchParams).locale;
  const locale = requestedLocale === "ar" ? "ar" : "en";
  const session = await getAuthContext();
  if (!session) redirect(`/${locale}/auth/teacher/login`);
  redirect(session.role === "teacher" || session.role === "admin" ? `/${locale}/teacher` : `/${locale}/dashboard`);
}
