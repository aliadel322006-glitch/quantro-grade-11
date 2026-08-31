import { notFound, redirect } from "next/navigation";
import { AdminBootstrapForm } from "@/components/admin-bootstrap-form";
import { initialAdminExists } from "@/lib/auth/staff-provisioning";
import { isLocale } from "@/lib/i18n";

export default async function InitialAdminSetupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (await initialAdminExists()) redirect(`/${locale}/auth/admin/login`);
  return <AdminBootstrapForm locale={locale} />;
}
