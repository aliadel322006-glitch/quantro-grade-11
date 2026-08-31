"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppLocale } from "@/lib/i18n";

export type ThemePreference = "light" | "dark";

const storageKey = "quantro-ai:theme-preference";

function deviceDefaultTheme(): ThemePreference {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.theme = preference;
  document.documentElement.dataset.themePreference = preference;
}

const copy = {
  en: { title: "Theme", help: "Choose how Quantro AI appears on this device.", light: "Light mode", dark: "Dark mode", switchToLight: "Switch to light mode", switchToDark: "Switch to dark mode" },
  ar: { title: "المظهر", help: "اختر طريقة ظهور Quantro AI على هذا الجهاز.", light: "الوضع الفاتح", dark: "الوضع الداكن", switchToLight: "التبديل إلى الوضع الفاتح", switchToDark: "التبديل إلى الوضع الداكن" },
} as const;

export function ThemePreferenceControl({ locale, compact = false }: { locale: AppLocale; compact?: boolean }) {
  const t = copy[locale];
  const [preference, setPreference] = useState<ThemePreference>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    // A device preference remains only the first-visit default. Once a learner
    // makes a choice, the stored value is always one explicit, visible option.
    const initial: ThemePreference = stored === "light" || stored === "dark" ? stored : deviceDefaultTheme();
    setPreference(initial);
    applyTheme(initial);
  }, []);

  const choose = (next: ThemePreference) => {
    setPreference(next);
    window.localStorage.setItem(storageKey, next);
    applyTheme(next);
  };

  if (compact) {
    const next = preference === "light" ? "dark" : "light";
    const Icon = preference === "light" ? Moon : Sun;
    const label = next === "dark" ? t.switchToDark : t.switchToLight;
    return <button className="theme-compact" type="button" onClick={() => choose(next)} aria-label={label} title={label}><Icon size={17} /><span>{t[preference]}</span></button>;
  }

  const options: Array<{ id: ThemePreference; Icon: typeof Sun }> = [
    { id: "light", Icon: Sun }, { id: "dark", Icon: Moon },
  ];
  return <section className="theme-preferences" aria-labelledby="theme-preference-title">
    <div><h2 id="theme-preference-title">{t.title}</h2><p>{t.help}</p></div>
    <div className="theme-choice-group" role="radiogroup" aria-label={t.title}>
      {options.map(({ id, Icon }) => <button key={id} className="theme-choice" data-active={preference === id} type="button" role="radio" aria-checked={preference === id} onClick={() => choose(id)}><Icon size={18} /><span>{t[id]}</span></button>)}
    </div>
  </section>;
}
