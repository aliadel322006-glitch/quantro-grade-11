"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

// Keep this emergency page request-rendered; it must never depend on lesson state.
export const dynamic = "force-dynamic";

export default function GlobalError() {
  return <html lang="en" dir="ltr"><body>
    <main style={{ maxWidth: 680, margin: "10vh auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#18324a" }}>
      <p style={{ color: "#4edea3", fontWeight: 800 }}>Quantro AI</p>
      <h1>Something needs another try</h1>
      <p>The lesson was not changed. Return to the learning home and try again.</p>
      <a href="/en" style={{ color: "#163c63", fontWeight: 800 }}>Return to Unit 1</a>
    </main>
  </body></html>;
}
