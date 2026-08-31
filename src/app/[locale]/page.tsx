import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getAuthContext } from "@/lib/auth/server";
import { isLocale } from "@/lib/i18n";

/** The locale root is deliberately public; protected learning remains under /dashboard. */
export default async function PublicLocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LandingPage locale={locale} session={await getAuthContext()} />;
}
