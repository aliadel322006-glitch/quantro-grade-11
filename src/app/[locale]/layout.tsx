import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LocaleHtmlAttributes } from "@/components/locale-html-attributes";
import { PwaRegister } from "@/components/pwa-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuthContext } from "@/lib/auth/server";
import { isLocale, type AppLocale } from "@/lib/i18n";

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  const session = await getAuthContext();
  return <>
    <LocaleHtmlAttributes locale={locale} />
    <a className="skip-link" href="#main-content">{locale === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content"}</a>
    <PwaRegister locale={locale} />
    <SiteHeader locale={locale} session={session} />
    {children}
    <SiteFooter locale={locale} />
  </>;
}
