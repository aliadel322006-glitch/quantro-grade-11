import { notFound } from "next/navigation";
import { HomeDashboard } from "@/components/home-dashboard";
import { requireStudentCurriculum } from "@/lib/auth/guards";
import { isLocale } from "@/lib/i18n";
import { loadStudentDashboardClassSummary } from "@/lib/student-dashboard-server";

/** Authenticated student workspace; the public locale root remains the landing page. */
export default async function StudentDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireStudentCurriculum(locale);
  const classSummary = await loadStudentDashboardClassSummary(session);
  return <HomeDashboard locale={locale} studentName={session.displayName} classSummary={classSummary} />;
}
