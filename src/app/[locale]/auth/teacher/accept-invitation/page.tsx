import { notFound } from "next/navigation";
import { TeacherInvitationForm } from "@/components/teacher-invitation-form";
import { isLocale } from "@/lib/i18n";

export default async function TeacherInvitationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ locale }, { token }] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  return <TeacherInvitationForm locale={locale} token={token} />;
}
