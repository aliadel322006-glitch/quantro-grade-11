"use client";

import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import type { AppLocale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: AppLocale }) {
  const pathname = usePathname();
  if (pathname === `/${locale}`) return null;
  return (
    <footer className="footer">
      <div className="shell footer-row">
        <span>© 2026 Quantro AI · {locale === "ar" ? "نسخة تجريبية تعليمية" : "Educational pilot"}</span>
        <span className="badge"><ShieldCheck size={14} aria-hidden="true" />{locale === "ar" ? "بيانات اصطناعية فقط" : "Synthetic data only"}</span>
      </div>
    </footer>
  );
}
