/* eslint-disable @next/next/no-html-link-for-pages */

export default function NotFound() {
  return <main id="main-content" className="page shell">
    <section className="form-card card">
      <span className="eyebrow">404</span>
      <h1>Lesson not found</h1>
      <p>The requested lesson is not part of this pilot, or its link is no longer available.</p>
      <a className="button" href="/en">Return to Unit 1</a>
    </section>
  </main>;
}
