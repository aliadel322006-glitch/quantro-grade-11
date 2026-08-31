import type { ReactNode } from "react";
import "./globals.css";

// Routes are served dynamically so access control and pinned lesson versions are
// evaluated on the server; the PWA worker supplies the offline experience.
export const dynamic = "force-dynamic";

const setInitialPreferences = `
  (function () {
    var locale = location.pathname.split('/')[1] === 'ar' ? 'ar' : 'en';
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    var saved = localStorage.getItem('quantro-ai:theme-preference');
    var preference = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = preference;
    document.documentElement.dataset.themePreference = preference;
  })();
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" dir="ltr" suppressHydrationWarning>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#6657e8" />
      <meta name="description" content="Quantro AI: bilingual interactive learning for Grade 11 Programming and Artificial Intelligence." />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <title>Quantro AI</title>
      <script dangerouslySetInnerHTML={{ __html: setInitialPreferences }} />
    </head>
    <body>{children}</body>
  </html>;
}
