import { notFound } from "next/navigation";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { isLocale } from "@/lib/i18n";
import { requireTeacher } from "@/lib/auth/guards";

export default async function TeacherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireTeacher(locale);
  return <TeacherDashboard locale={locale} teacherName={session.displayName} />;
}
