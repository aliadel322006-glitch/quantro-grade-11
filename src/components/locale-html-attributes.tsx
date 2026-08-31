"use client";

import { useEffect } from "react";
import type { AppLocale } from "@/lib/i18n";

/** Keeps language and reading direction correct after client-side locale navigation. */
export function LocaleHtmlAttributes({ locale }: { locale: AppLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
