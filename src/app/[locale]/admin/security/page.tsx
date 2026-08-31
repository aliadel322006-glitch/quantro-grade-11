import { notFound } from "next/navigation";
import { AdminMfaSetup } from "@/components/admin-mfa-setup";
import { requireAdmin } from "@/lib/auth/guards";
import { isLocale } from "@/lib/i18n";

export default async function AdminSecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireAdmin(locale);
  return <main id="main-content" className="page shell admin-page"><AdminMfaSetup locale={locale} /></main>;
}
