"use client";

import { BarChart3, BookOpenCheck, Copy, Download, KeyRound, Plus, RefreshCw, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AccessCodeManager } from "@/components/access-code-manager";
import { GlobalContentPanels } from "@/components/global-content-panels";
import type { AppLocale } from "@/lib/i18n";

type Learner = { id: string; progress: number; pre: number; post: number | null; review: number };

const startingLearners: Learner[] = [
  { id: "STUDENT1", progress: 88, pre: 44, post: 69, review: 1 },
  { id: "STUDENT2", progress: 63, pre: 50, post: 65, review: 2 },
  { id: "STUDENT3", progress: 100, pre: 38, post: 72, review: 0 },
  { id: "STUDENT4", progress: 31, pre: 56, post: null, review: 1 },
  { id: "STUDENT5", progress: 75, pre: 47, post: 66, review: 0 },
];

function randomCode(length: number, alphabet: string) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return [...values].map((value) => alphabet[value % alphabet.length]).join("");
}

export function TeacherDashboard({ locale, teacherName }: { locale: AppLocale; teacherName?: string }) {
  const ar = locale === "ar";
  const [classCode, setClassCode] = useState("FUTURE11");
  const [learners, setLearners] = useState(startingLearners);
  const [credential, setCredential] = useState<{ id: string; pin: string } | null>(null);
  const completed = Math.round(learners.reduce((sum, learner) => sum + learner.progress, 0) / learners.length);
  const gains = learners.filter((learner) => learner.post !== null).map((learner) => (learner.post ?? 0) - learner.pre);
  const medianGain = useMemo(() => {
    const sorted = [...gains].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  }, [gains]);
  const pending = learners.reduce((sum, learner) => sum + learner.review, 0);

  function generateLearner() {
    const id = `STUDENT${learners.length + 1}`;
    const pin = randomCode(8, "0123456789");
    setLearners((current) => [...current, { id, progress: 0, pre: 0, post: null, review: 0 }]);
    setCredential({ id, pin });
  }

  function exportCsv() {
    const rows = ["learner_id,progress_percent,pre_score,post_score,pending_review", ...learners.map((item) => `${item.id},${item.progress},${item.pre},${item.post ?? ""},${item.review}`)];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "quantro-ai-demo-class.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main id="main-content" className="page shell">
      <div className="inner-page-head">
        <div><span className="eyebrow">{ar ? "لوحة المعلّم" : "Teacher dashboard"}</span><h1 style={{ margin: "5px 0", color: "var(--navy)" }}>{ar ? `مرحبًا، ${teacherName ?? "المعلم"}` : `Good afternoon, ${teacherName ?? "Teacher"}`}</h1><p style={{ margin: 0, color: "var(--muted)" }}>{ar ? "نظرة واضحة على تقدم الفصل والاختبارات والعناصر التي تحتاج إلى مراجعة." : "A clear view of class progress, quiz performance, and work needing review."}</p></div>
        <button className="button ghost" type="button" onClick={exportCsv}><Download size={18} aria-hidden="true" />{ar ? "تصدير CSV" : "Export CSV"}</button>
      </div>

      <section className="dashboard-grid" aria-label={ar ? "ملخص الفصل" : "Class summary"}>
        <div className="dashboard-stat-grid">
          <article className="panel dashboard-card dashboard-stat-card">
            <div className="stat-card-top"><span className="card-icon"><BookOpenCheck aria-hidden="true" /></span><span className="stat-context">{learners.length} {ar ? "متعلّمين" : "learners"}</span></div>
            <div className="metric">{completed}%</div>
            <h2>{ar ? "متوسط الإكمال" : "Average completion"}</h2>
            <p className="stat-support">{ar ? "تقدم الفصل في الدروس والأنشطة" : "Class progress across lessons and activities"}</p>
            <div className="stat-progress" aria-label={ar ? `متوسط الإكمال ${completed}%` : `Average completion ${completed}%`}><span style={{ width: `${completed}%` }} /></div>
          </article>
          <article className="panel dashboard-card dashboard-stat-card">
            <div className="stat-card-top"><span className="card-icon"><BarChart3 aria-hidden="true" /></span><span className="stat-context">{gains.length} {ar ? "اختبارات بعدية" : "post-tests"}</span></div>
            <div className="metric">+{medianGain}</div>
            <h2>{ar ? "وسيط التحسن بالنقاط" : "Median point gain"}</h2>
            <p className="stat-support">{ar ? "الفرق بين نتائج الاختبار القبلي والبعدي" : "Difference between pre- and post-test results"}</p>
          </article>
          <article className="panel dashboard-card dashboard-stat-card review-queue-card">
            <div className="stat-card-top"><span className="card-icon"><Users aria-hidden="true" /></span><span className="stat-context">{ar ? "المراجعة" : "Review queue"}</span></div>
            <div className="metric">{pending}</div>
            <h2>{ar ? "بانتظار المراجعة" : "Review queue"}</h2>
            <p className="stat-support">{ar ? "إجابات مفتوحة تنتظر تقييم المعلّم" : "Open responses awaiting teacher scoring"}</p>
            <button className="button small" type="button">{ar ? "ابدأ المراجعة" : "Start reviewing"}</button>
          </article>
        </div>

        <article className="panel dashboard-card wide">
          <div className="status-head"><div><span className="eyebrow">{ar ? "وصول الفصل" : "Class access"}</span><h2>{ar ? "رمز الانضمام" : "Join code"}</h2></div><span className="badge"><KeyRound size={14} aria-hidden="true" />{ar ? "8 رموز" : "8 characters"}</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <code style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: ".14em", color: "var(--navy)" }}>{classCode}</code>
            <button className="button ghost small" type="button" onClick={() => navigator.clipboard?.writeText(classCode)}><Copy size={16} aria-hidden="true" />{ar ? "نسخ" : "Copy"}</button>
            <button className="button ghost small" type="button" onClick={() => setClassCode(randomCode(8, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"))}><RefreshCw size={16} aria-hidden="true" />{ar ? "تدوير الرمز" : "Rotate code"}</button>
          </div>
          <p style={{ color: "var(--muted)", marginBlockEnd: 0 }}>{ar ? "تدوير الرمز لا يُخرج المتعلمين الحاليين؛ بل يمنع عمليات الانضمام الجديدة بالرمز السابق." : "Rotating the code keeps existing learners signed in and blocks new joins with the previous code."}</p>
        </article>

        <article className="panel dashboard-card full">
          <div className="status-head"><div><span className="eyebrow">{ar ? "قائمة الفصل" : "Class roster"}</span><h2>{ar ? "التقدّم حسب المتعلّم" : "Learner progress"}</h2></div><button className="button small" type="button" onClick={generateLearner}><Plus size={17} aria-hidden="true" />{ar ? "أنشئ رمز متعلّم" : "Issue learner credential"}</button></div>
          {credential && (
            <div className="feedback" role="status" style={{ marginBlockEnd: 16 }}>
              <div><strong>{ar ? "اعرض هذه البيانات مرة واحدة:" : "Show these credentials once:"}</strong><br /><code>{classCode} · {credential.id} · {credential.pin}</code></div>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>{ar ? "معرّف المتعلّم" : "Learner ID"}</th><th>{ar ? "الإكمال" : "Completion"}</th><th>{ar ? "قبلي" : "Pre"}</th><th>{ar ? "بعدي" : "Post"}</th><th>{ar ? "للمراجعة" : "Review"}</th><th>{ar ? "الوصول" : "Access"}</th></tr></thead>
              <tbody>{learners.map((learner) => <tr key={learner.id}><td><strong>{learner.id}</strong></td><td><span className="badge">{learner.progress}%</span></td><td>{learner.pre}%</td><td>{learner.post === null ? "—" : `${learner.post}%`}</td><td>{learner.review ? <span className="badge attention">{learner.review}</span> : <span className="badge">0</span>}</td><td><button className="button ghost small" type="button" onClick={() => setCredential({ id: learner.id, pin: randomCode(8, "0123456789") })}>{ar ? "إعادة PIN" : "Reset PIN"}</button></td></tr>)}</tbody>
            </table>
          </div>
        </article>
        <section id="access-codes" className="dashboard-grid-full"><AccessCodeManager locale={locale} /></section>
        <section className="dashboard-grid-full"><GlobalContentPanels locale={locale} role="teacher" /></section>
      </section>
    </main>
  );
}
