import { notFound } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { isLocale } from "@/lib/i18n";

export default async function StudentLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LoginForm locale={locale} role="student" />;
}
