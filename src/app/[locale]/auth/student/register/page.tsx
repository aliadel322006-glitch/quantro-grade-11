import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { isLocale } from "@/lib/i18n";

export default async function StudentRegistrationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <RegisterForm locale={locale} />;
}
