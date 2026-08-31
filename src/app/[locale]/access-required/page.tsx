import { notFound } from "next/navigation";
import { AccessRequiredForm } from "@/components/auth-forms";
import { getAuthContext } from "@/lib/auth/server";
import { isLocale } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function AccessRequiredPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await getAuthContext();
  if (!session) redirect(`/${locale}/auth/student/login`);
  if (session.role !== "student") redirect(`/${locale}/teacher`);
  if (session.curriculumAccess) redirect(`/${locale}/dashboard`);
  return <AccessRequiredForm locale={locale} />;
}
