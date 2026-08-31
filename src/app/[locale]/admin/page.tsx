import { notFound } from "next/navigation";
import { AdminStudio } from "@/components/admin-studio";
import { AdminTeacherManagement } from "@/components/admin-teacher-management";
import { isLocale } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireAdmin(locale);
  return <main id="main-content" className="page shell admin-page"><AdminTeacherManagement locale={locale} /><AdminStudio locale={locale} /></main>;
}
