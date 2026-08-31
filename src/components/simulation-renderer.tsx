"use client";

import { useMemo, useState } from "react";
import type { JsonValue, Locale, SimulationBlock } from "@/lib/types";

type Props = {
  block: SimulationBlock;
  locale: Locale;
  initialValue?: JsonValue;
  onComplete: (response: JsonValue) => void;
};

const copy = (locale: Locale, en: string, ar: string) =>
  locale === "ar" ? ar : en;

const finish = (locale: Locale) =>
  copy(locale, "Save this investigation", "احفظ هذا الاستكشاف");

function Finish({ locale, onClick }: { locale: Locale; onClick: () => void }) {
  return <button className="button small" type="button" onClick={onClick}>{finish(locale)}</button>;
}

function MoveList({
  locale,
  items,
  onComplete,
  answer,
}: {
  locale: Locale;
  items: { id: string; en: string; ar: string }[];
  onComplete: (value: JsonValue) => void;
  answer?: readonly string[];
}) {
  const [order, setOrder] = useState(items.map((item) => item.id).reverse());
  const [checked, setChecked] = useState(false);
  const move = (index: number, delta: number) => {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setChecked(false);
  };
  const correct = answer ? order.every((id, index) => id === answer[index]) : true;

  return <div className="simulation-shell">
    <p className="activity-copy">{copy(locale, "Use the buttons as a keyboard-friendly alternative to dragging.", "استخدم الأزرار كبديل مناسب للوحة المفاتيح عن السحب.")}</p>
    <ol className="option-grid" aria-label={copy(locale, "Ordered cards", "البطاقات المرتبة")}>
      {order.map((id, index) => {
        const item = items.find((entry) => entry.id === id)!;
        return <li className="sim-card" key={id}>
          <strong>{index + 1}. {locale === "ar" ? item.ar : item.en}</strong>
          <div className="inline-actions">
            <button className="button ghost small" type="button" onClick={() => move(index, -1)} disabled={index === 0}>{copy(locale, "Earlier", "أسبق")}</button>
            <button className="button ghost small" type="button" onClick={() => move(index, 1)} disabled={index === order.length - 1}>{copy(locale, "Later", "لاحق")}</button>
          </div>
        </li>;
      })}
    </ol>
    <div className="inline-actions">
      {answer && <button className="button ghost small" type="button" onClick={() => setChecked(true)}>{copy(locale, "Check order", "تحقق من الترتيب")}</button>}
      <Finish locale={locale} onClick={() => onComplete({ order, correct: answer ? correct : null })} />
    </div>
    {checked && <p className={`feedback ${correct ? "" : "error"}`} role="status">{correct ? copy(locale, "The sequence is coherent.", "التسلسل مترابط.") : copy(locale, "Try moving one card at a time and compare dates or responsibilities.", "حاول تحريك بطاقة واحدة في كل مرة وقارن التواريخ أو المسؤوليات.")}</p>}
  </div>;
}

function GrowthModel({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const [start, setStart] = useState(1000);
  const [interval, setInterval] = useState(2);
  const values = useMemo(() => Array.from({ length: 6 }, (_, period) => ({
    year: period * interval,
    exponential: start * 2 ** period,
    linear: start + start * period,
  })), [start, interval]);
  return <div className="simulation-shell">
    <div className="data-grid">
      <label className="field">{copy(locale, "Starting components", "المكوّنات الابتدائية")}
        <input type="range" min="500" max="4000" step="500" value={start} onChange={(event) => setStart(Number(event.target.value))} />
        <output>{start.toLocaleString()}</output>
      </label>
      <label className="field">{copy(locale, "Doubling interval (years)", "فترة التضاعف (بالسنوات)")}
        <input type="range" min="1" max="4" value={interval} onChange={(event) => setInterval(Number(event.target.value))} />
        <output>{interval}</output>
      </label>
    </div>
    <div className="table-wrap"><table><caption className="sr-only">{copy(locale, "Exponential and linear values", "قيم النمو الأسي والخطي")}</caption><thead><tr><th>{copy(locale, "Year", "السنة")}</th><th>{copy(locale, "Repeated doubling", "تضاعف متكرر")}</th><th>{copy(locale, "Same addition", "إضافة ثابتة")}</th></tr></thead><tbody>{values.map((value) => <tr key={value.year}><td>{value.year}</td><td>{value.exponential.toLocaleString()}</td><td>{value.linear.toLocaleString()}</td></tr>)}</tbody></table></div>
    <p className="feedback" role="status">{copy(locale, `After ${values.at(-1)?.year} years, repeated doubling reaches ${values.at(-1)?.exponential.toLocaleString()}, while equal additions reach ${values.at(-1)?.linear.toLocaleString()}.`, `بعد ${values.at(-1)?.year} سنوات، يصل التضاعف المتكرر إلى ${values.at(-1)?.exponential.toLocaleString()} بينما تصل الإضافات المتساوية إلى ${values.at(-1)?.linear.toLocaleString()}.`)}</p>
    <Finish locale={locale} onClick={() => onComplete({ start, interval, values })} />
  </div>;
}

function EdgeCloud({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const [delay, setDelay] = useState(120);
  const [camera, setCamera] = useState("edge");
  const [reports, setReports] = useState("cloud");
  const cloudDelay = delay + 45;
  return <div className="simulation-shell">
    <label className="field">{copy(locale, "Network delay", "تأخير الشبكة")}: {delay} ms
      <input type="range" min="20" max="600" step="20" value={delay} onChange={(event) => setDelay(Number(event.target.value))} />
    </label>
    <div className="table-wrap"><table><thead><tr><th>{copy(locale, "Location", "الموقع")}</th><th>{copy(locale, "Estimated reaction", "زمن الاستجابة المتوقع")}</th><th>{copy(locale, "During outage", "أثناء الانقطاع")}</th><th>{copy(locale, "Capacity", "القدرة")}</th></tr></thead><tbody><tr><td>{copy(locale, "Edge device", "الجهاز الطرفي")}</td><td>35 ms</td><td>{copy(locale, "Works locally", "يعمل محليًا")}</td><td>{copy(locale, "Limited", "محدودة")}</td></tr><tr><td>{copy(locale, "Cloud service", "الخدمة السحابية")}</td><td>{cloudDelay} ms</td><td>{copy(locale, "Stops or delays", "يتوقف أو يتأخر")}</td><td>{copy(locale, "High", "عالية")}</td></tr></tbody></table></div>
    <div className="data-grid">
      <label className="field">{copy(locale, "Emergency camera", "كاميرا الطوارئ")}<select className="select-input" value={camera} onChange={(e) => setCamera(e.target.value)}><option value="edge">{copy(locale, "Edge essential detection", "اكتشاف أساسي طرفي")}</option><option value="cloud">{copy(locale, "Cloud only", "سحابي فقط")}</option><option value="hybrid">{copy(locale, "Hybrid", "هجين")}</option></select></label>
      <label className="field">{copy(locale, "Overnight school reports", "تقارير المدرسة الليلية")}<select className="select-input" value={reports} onChange={(e) => setReports(e.target.value)}><option value="edge">{copy(locale, "Edge only", "طرفي فقط")}</option><option value="cloud">{copy(locale, "Cloud aggregation", "تجميع سحابي")}</option><option value="hybrid">{copy(locale, "Hybrid", "هجين")}</option></select></label>
    </div>
    <p className={`feedback ${camera === "edge" && reports === "cloud" ? "" : "error"}`} role="status">{camera === "edge" && reports === "cloud" ? copy(locale, "Strong fit: immediate safety action is local; aggregate reporting can use cloud capacity.", "اختيار مناسب: إجراء السلامة الفوري محلي، والتقارير المجمعة يمكن أن تستخدم قدرة السحابة.") : copy(locale, "Compare the consequence of delay and whether several sites need shared computing.", "قارن نتيجة التأخير والحاجة إلى حوسبة مشتركة بين مواقع عديدة.")}</p>
    <Finish locale={locale} onClick={() => onComplete({ delay, camera, reports })} />
  </div>;
}

function CashlessBudget({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const names = [
    ["cash", "Cash backup", "دعم نقدي"], ["offline", "Offline cards", "بطاقات تعمل دون اتصال"], ["privacy", "Privacy minimisation", "تقليل البيانات"], ["support", "Support and training", "الدعم والتدريب"], ["network", "Redundant network", "شبكة احتياطية"],
  ] as const;
  const [funds, setFunds] = useState<Record<string, number>>({ cash: 2, offline: 2, privacy: 2, support: 2, network: 2 });
  const total = Object.values(funds).reduce((sum, value) => sum + value, 0);
  return <div className="simulation-shell">
    <p className="activity-copy">{copy(locale, "Allocate a fictional 10-point budget. No real personal or financial data is used.", "وزّع ميزانية خيالية من 10 نقاط. لا تُستخدم بيانات شخصية أو مالية حقيقية.")}</p>
    <div className="data-grid">{names.map(([id, en, ar]) => <label className="field" key={id}>{locale === "ar" ? ar : en}<input className="text-input" type="number" min="0" max="5" value={funds[id]} onChange={(e) => setFunds((current) => ({ ...current, [id]: Math.max(0, Math.min(5, Number(e.target.value) || 0)) }))} /></label>)}</div>
    <p className={`feedback ${total <= 10 ? "" : "error"}`} role="status">{copy(locale, `Budget used: ${total}/10.`, `الميزانية المستخدمة: ${total}/10.`)} {total <= 10 ? copy(locale, "Consider access, privacy, and continuity together.", "فكّر في الوصول والخصوصية والاستمرارية معًا.") : copy(locale, "Reduce one safeguard before saving.", "خفّض إجراء حماية واحدًا قبل الحفظ.")}</p>
    <Finish locale={locale} onClick={() => onComplete({ funds, total, withinBudget: total <= 10 })} />
  </div>;
}

function Hierarchy({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const [ml, setMl] = useState("ai"); const [dl, setDl] = useState("ml");
  const correct = ml === "ai" && dl === "ml";
  return <div className="simulation-shell"><div className="hierarchy" aria-label={copy(locale, "AI hierarchy", "التسلسل الهرمي للذكاء الاصطناعي")}><div className="hierarchy-ring" style={{ width: "100%", height: 300, borderColor: "#163c63" }}>{copy(locale, "Artificial intelligence", "الذكاء الاصطناعي")}<div className="hierarchy-ring" style={{ width: "72%", height: 205, borderColor: "#1f9d8b" }}>{copy(locale, "Machine learning", "تعلم الآلة")}<div className="hierarchy-ring" style={{ width: "62%", height: 108, borderColor: "#ff6b57" }}>{copy(locale, "Deep learning", "التعلم العميق")}</div></div></div></div><div className="data-grid"><label className="field">{copy(locale, "Machine learning belongs inside", "تعلم الآلة يقع داخل")}<select className="select-input" value={ml} onChange={(e) => setMl(e.target.value)}><option value="ai">AI</option><option value="dl">Deep learning</option><option value="none">{copy(locale, "Neither", "لا شيء منهما")}</option></select></label><label className="field">{copy(locale, "Deep learning belongs inside", "التعلم العميق يقع داخل")}<select className="select-input" value={dl} onChange={(e) => setDl(e.target.value)}><option value="ml">Machine learning</option><option value="ai">AI</option><option value="none">{copy(locale, "Neither", "لا شيء منهما")}</option></select></label></div><p className={`feedback ${correct ? "" : "error"}`} role="status">{correct ? copy(locale, "Correct: deep learning is a subset of machine learning, which is a subset of AI.", "صحيح: التعلم العميق جزء من تعلم الآلة، وهو بدوره جزء من الذكاء الاصطناعي.") : copy(locale, "Use the nesting diagram and try again.", "استخدم مخطط التداخل وحاول مرة أخرى.")}</p><Finish locale={locale} onClick={() => onComplete({ machineLearningParent: ml, deepLearningParent: dl, correct })} /></div>;
}

function Sorter({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const cards = [
    ["pin", "Minimum PIN length", "الحد الأدنى لطول الرقم السري", "rules"],
    ["writing", "Recognising handwriting", "التعرف على خط اليد", "learning"],
    ["loan", "Age limit plus risk estimate", "حد عمري مع تقدير خطر", "hybrid"],
    ["bell", "School bell timetable", "جدول جرس المدرسة", "rules"],
    ["plant", "Classifying plant photos", "تصنيف صور النباتات", "learning"],
  ] as const;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const score = cards.filter(([id,,, expected]) => answers[id] === expected).length;
  return <div className="simulation-shell"><p className="activity-copy">{copy(locale, "Classify by how the task is performed, not by a marketing label.", "صنّف بحسب كيفية تنفيذ المهمة، لا بحسب تسمية تسويقية.")}</p><div className="option-grid">{cards.map(([id, en, ar]) => <label className="field sim-card" key={id}>{locale === "ar" ? ar : en}<select className="select-input" value={answers[id] ?? ""} onChange={(e) => setAnswers((current) => ({ ...current, [id]: e.target.value }))}><option value="">{copy(locale, "Choose a method", "اختر طريقة")}</option><option value="rules">{copy(locale, "Written rules", "قواعد مكتوبة")}</option><option value="learning">{copy(locale, "Learned from examples", "متعَلَّم من أمثلة")}</option><option value="hybrid">{copy(locale, "Hybrid", "هجين")}</option></select></label>)}</div><p className={`feedback ${score >= 4 ? "" : "error"}`} role="status">{copy(locale, `${score}/5 classifications match the method.`, `${score}/5 تصنيفات تطابق الطريقة.`)}</p><Finish locale={locale} onClick={() => onComplete({ answers, score })} /></div>;
}

function Coverage({ locale, onComplete, hiring = false }: Pick<Props, "locale" | "onComplete"> & { hiring?: boolean }) {
  const [minority, setMinority] = useState(hiring ? 20 : 10);
  const [threshold, setThreshold] = useState(50);
  const majority = 100 - minority;
  const gap = Math.max(0, Math.round((majority - minority) * 0.65));
  const minorityAccuracy = Math.max(45, 95 - gap);
  const majorityAccuracy = Math.min(98, 82 + Math.round(majority * 0.14));
  return <div className="simulation-shell"><label className="field">{hiring ? copy(locale, "Group B representation in synthetic training cases", "تمثيل المجموعة ب في حالات التدريب الاصطناعية") : copy(locale, "Less represented group in synthetic examples", "المجموعة الأقل تمثيلًا في الأمثلة الاصطناعية")}: {minority}%<input type="range" min="5" max="50" value={minority} onChange={(e) => setMinority(Number(e.target.value))} /></label>{hiring && <label className="field">{copy(locale, "Decision threshold", "عتبة القرار")}: {threshold}<input type="range" min="30" max="70" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /></label>}<div className="data-grid"><div className="data-tile"><span>{copy(locale, "Group A", "المجموعة أ")}</span><strong>{majorityAccuracy}%</strong><small>{copy(locale, "synthetic success rate", "معدل نجاح اصطناعي")}</small></div><div className="data-tile"><span>{copy(locale, "Group B", "المجموعة ب")}</span><strong>{Math.max(0, minorityAccuracy - (hiring ? Math.abs(threshold - 50) / 3 : 0)).toFixed(0)}%</strong><small>{copy(locale, "synthetic success rate", "معدل نجاح اصطناعي")}</small></div><div className="data-tile"><span>{copy(locale, "Gap", "الفجوة")}</span><strong>{gap}</strong><small>{copy(locale, "percentage points", "نقطة مئوية")}</small></div></div><p className="feedback" role="status">{copy(locale, "A high overall score can conceal uneven outcomes. Inspect relevant groups before deployment.", "قد تخفي الدرجة الإجمالية المرتفعة نتائج غير متساوية. افحص المجموعات المهمة قبل النشر.")}</p><Finish locale={locale} onClick={() => onComplete({ minorityRepresentation: minority, threshold: hiring ? threshold : null, majorityAccuracy, minorityAccuracy, gap })} /></div>;
}

function Hallucination({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const cases = [
    ["hours", "Museum is open until 22:00; its cited page does not exist.", "المتحف مفتوح حتى 22:00، لكن الصفحة المذكورة لا وجود لها.", "invented"],
    ["result", "A study result contradicts the supplied fictional evidence pack.", "نتيجة دراسة تناقض حزمة الأدلة الخيالية المعطاة.", "contradicted"],
    ["advice", "A health claim is not covered by the supplied evidence.", "ادعاء صحي لا تغطيه الأدلة المتاحة.", "uncertain"],
  ] as const;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const score = cases.filter(([id,,, expected]) => answers[id] === expected).length;
  return <div className="simulation-shell"><p className="activity-copy">{copy(locale, "This is a curated fiction-only evidence exercise; it does not call a live AI service.", "هذا تمرين أدلة خيالي مُعدّ مسبقًا فقط، ولا يستدعي خدمة ذكاء اصطناعي مباشرة.")}</p>{cases.map(([id, en, ar]) => <label key={id} className="field sim-card">{locale === "ar" ? ar : en}<select className="select-input" value={answers[id] ?? ""} onChange={(e) => setAnswers((current) => ({ ...current, [id]: e.target.value }))}><option value="">{copy(locale, "Mark the claim", "حدّد حالة الادعاء")}</option><option value="supported">{copy(locale, "Supported", "مدعوم")}</option><option value="contradicted">{copy(locale, "Contradicted", "متناقض")}</option><option value="invented">{copy(locale, "Invented citation", "مرجع مختلق")}</option><option value="uncertain">{copy(locale, "Uncertain", "غير مؤكد")}</option></select></label>)}<p className={`feedback ${score === cases.length ? "" : "error"}`} role="status">{copy(locale, `${score}/3 claims classified. Uncertain is not the same as false.`, `${score}/3 ادعاءات صُنّفت. غير المؤكد ليس هو نفسه الخاطئ.`)}</p><Finish locale={locale} onClick={() => onComplete({ answers, score })} /></div>;
}

function Recommendation({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const [signals, setSignals] = useState<string[]>(["topics", "completion"]); const [goal, setGoal] = useState("variety"); const [rounds, setRounds] = useState(0);
  const options = [["topics", "Chosen topics", "الموضوعات المختارة"], ["clicks", "Recent clicks", "النقرات الأخيرة"], ["completion", "Reading completion", "إكمال القراءة"], ["age", "Age band", "الفئة العمرية"], ["location", "Exact location", "الموقع الدقيق"], ["popularity", "Popularity score", "درجة الشعبية"]] as const;
  const toggle = (id: string) => setSignals((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <div className="simulation-shell"><fieldset><legend>{copy(locale, "Allowed synthetic signals", "الإشارات الاصطناعية المسموح بها")}</legend><div className="data-grid">{options.map(([id, en, ar]) => <label key={id}><input type="checkbox" checked={signals.includes(id)} onChange={() => toggle(id)} /> {locale === "ar" ? ar : en}</label>)}</div></fieldset><label className="field">{copy(locale, "Ranking goal", "هدف الترتيب")}<select className="select-input" value={goal} onChange={(e) => setGoal(e.target.value)}><option value="relevance">{copy(locale, "Relevance", "الصلة")}</option><option value="variety">{copy(locale, "Variety", "التنوع")}</option><option value="completion">{copy(locale, "Completion", "الإكمال")}</option></select></label><div className="inline-actions"><button className="button ghost small" type="button" onClick={() => setRounds((value) => Math.min(3, value + 1))}>{copy(locale, "Run a fictional round", "شغّل جولة خيالية")}</button><span className="badge">{copy(locale, `Rounds: ${rounds}/3`, `الجولات: ${rounds}/3`)}</span></div><p className="feedback" role="status">{copy(locale, `Input → ${goal} ranking → selected item → allowed feedback. ${signals.includes("location") ? "Exact location is not needed for this library purpose." : "You avoided exact location."}`, `إدخال ← ترتيب حسب ${goal} ← عنصر مختار ← تغذية راجعة مسموحة. ${signals.includes("location") ? "الموقع الدقيق غير مطلوب لغرض المكتبة." : "تجنبت الموقع الدقيق."}`)}</p><Finish locale={locale} onClick={() => onComplete({ signals, goal, rounds, privacyAware: !signals.includes("location") })} /></div>;
}

function MissionMap({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const missions = [["farming", "Farming", "الزراعة", "moisture-risk"], ["manufacturing", "Manufacturing", "التصنيع", "fault-risk"], ["logistics", "Logistics", "الخدمات اللوجستية", "delay-risk"], ["education", "Education", "التعليم", "topic-suggestion"], ["clinical", "Clinical support", "الدعم السريري", "review-flag"]] as const;
  const [answers, setAnswers] = useState<Record<string, string>>({}); const score = missions.filter(([id,,, expected]) => answers[id] === expected).length;
  return <div className="simulation-shell"><div className="table-wrap"><table><thead><tr><th>{copy(locale, "Mission", "المهمة")}</th><th>{copy(locale, "Useful output", "المخرج المفيد")}</th></tr></thead><tbody>{missions.map(([id, en, ar]) => <tr key={id}><td>{locale === "ar" ? ar : en}</td><td><select className="select-input" value={answers[id] ?? ""} onChange={(e) => setAnswers((current) => ({ ...current, [id]: e.target.value }))}><option value="">{copy(locale, "Choose", "اختر")}</option><option value="moisture-risk">{copy(locale, "Moisture-risk estimate", "تقدير خطر الرطوبة")}</option><option value="fault-risk">{copy(locale, "Fault-risk score", "درجة خطر العطل")}</option><option value="delay-risk">{copy(locale, "Route delay estimate", "تقدير تأخير المسار")}</option><option value="topic-suggestion">{copy(locale, "Topic suggestion with reason", "اقتراح موضوع مع سبب")}</option><option value="review-flag">{copy(locale, "Review flag with evidence", "علامة مراجعة مع أدلة")}</option></select></td></tr>)}</tbody></table></div><p className="feedback" role="status">{copy(locale, `${score}/5 coherent mission-output links. Higher-risk uses need stronger review.`, `${score}/5 روابط مترابطة بين المهمة والمخرج. الاستخدامات الأعلى خطرًا تحتاج مراجعة أقوى.`)}</p><Finish locale={locale} onClick={() => onComplete({ answers, score })} /></div>;
}

function Oversight({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const [consequence, setConsequence] = useState("high"); const [uncertainty, setUncertainty] = useState("medium"); const [choice, setChoice] = useState("mandatory");
  const rank: Record<string, number> = { low: 1, medium: 2, high: 3 }; const needed = rank[consequence] + rank[uncertainty] >= 5 ? "mandatory" : rank[consequence] + rank[uncertainty] >= 3 ? "sampled" : "automatic";
  const labels: Record<string, [string, string]> = { automatic: ["Automatic action", "فعل آلي"], sampled: ["Sampled review", "مراجعة عينة"], mandatory: ["Mandatory review", "مراجعة إلزامية"], no: ["Do not deploy", "لا تنشر"] };
  return <div className="simulation-shell"><div className="data-grid"><label className="field">{copy(locale, "Error consequence", "نتيجة الخطأ")}<select className="select-input" value={consequence} onChange={(e) => setConsequence(e.target.value)}>{["low", "medium", "high"].map((value) => <option value={value} key={value}>{copy(locale, value[0].toUpperCase()+value.slice(1), value === "low" ? "منخفض" : value === "medium" ? "متوسط" : "مرتفع")}</option>)}</select></label><label className="field">{copy(locale, "Uncertainty", "عدم اليقين")}<select className="select-input" value={uncertainty} onChange={(e) => setUncertainty(e.target.value)}>{["low", "medium", "high"].map((value) => <option value={value} key={value}>{copy(locale, value[0].toUpperCase()+value.slice(1), value === "low" ? "منخفض" : value === "medium" ? "متوسط" : "مرتفع")}</option>)}</select></label></div><label className="field">{copy(locale, "Your oversight choice", "اختيارك للإشراف")}<select className="select-input" value={choice} onChange={(e) => setChoice(e.target.value)}>{Object.entries(labels).map(([id, [en, ar]]) => <option value={id} key={id}>{locale === "ar" ? ar : en}</option>)}</select></label><p className={`feedback ${choice === needed ? "" : "error"}`} role="status">{copy(locale, `Suggested response: ${locale === "ar" ? labels[needed][1] : labels[needed][0]}. A reviewer needs evidence and authority to intervene.`, `الاستجابة المقترحة: ${labels[needed][1]}. يحتاج المراجع إلى أدلة وسلطة للتدخل.`)}</p><Finish locale={locale} onClick={() => onComplete({ consequence, uncertainty, choice, suggested: needed })} /></div>;
}

function PrivacyBuilder({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const inputs = [["topics", "Chosen topics", "الموضوعات المختارة"], ["loans", "Current loans", "الاستعارات الحالية"], ["genres", "Returned genres", "الأنواع المعادة"], ["location", "Exact location", "الموقع الدقيق"], ["history", "Unrelated web history", "سجل ويب غير مرتبط"], ["age", "Age band", "الفئة العمرية"]] as const;
  const controls = [["why", "Why this?", "لماذا هذا؟"], ["reset", "Reset", "إعادة ضبط"], ["optout", "Opt out", "إلغاء الاشتراك"], ["variety", "Request variety", "طلب التنوع"]] as const;
  const [selected, setSelected] = useState<string[]>(["topics", "loans"]); const [chosenControls, setControls] = useState<string[]>(["why", "reset", "optout"]); const [retention, setRetention] = useState("30");
  const toggle = (id: string, kind: "data" | "control") => (kind === "data" ? setSelected : setControls)((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const privacy = Math.max(0, 100 - selected.length * 8 - (selected.includes("location") ? 25 : 0) - (selected.includes("history") ? 30 : 0) - (retention === "365" ? 15 : 0));
  return <div className="simulation-shell"><fieldset><legend>{copy(locale, "Data signals", "إشارات البيانات")}</legend><div className="data-grid">{inputs.map(([id, en, ar]) => <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id, "data")} /> {locale === "ar" ? ar : en}</label>)}</div></fieldset><fieldset><legend>{copy(locale, "User controls", "عناصر تحكم المستخدم")}</legend><div className="data-grid">{controls.map(([id, en, ar]) => <label key={id}><input type="checkbox" checked={chosenControls.includes(id)} onChange={() => toggle(id, "control")} /> {locale === "ar" ? ar : en}</label>)}</div></fieldset><label className="field">{copy(locale, "Retention", "مدة الاحتفاظ")}<select className="select-input" value={retention} onChange={(e) => setRetention(e.target.value)}><option value="0">{copy(locale, "Session only", "الجلسة فقط")}</option><option value="30">30 {copy(locale, "days", "يومًا")}</option><option value="90">90 {copy(locale, "days", "يومًا")}</option><option value="365">365 {copy(locale, "days", "يومًا")}</option></select></label><div className="meter" aria-label={copy(locale, `Privacy score ${privacy} out of 100`, `درجة الخصوصية ${privacy} من 100`)}><span style={{ width: `${privacy}%` }} /></div><p className="feedback" role="status">{copy(locale, `Privacy score: ${privacy}/100. Exact location and unrelated browsing are not necessary for this purpose.`, `درجة الخصوصية: ${privacy}/100. الموقع الدقيق وسجل التصفح غير المرتبط غير ضروريين لهذا الغرض.`)}</p><Finish locale={locale} onClick={() => onComplete({ selected, controls: chosenControls, retention, privacy })} /></div>;
}

function Explainability({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const [choice, setChoice] = useState("explainable");
  return <div className="simulation-shell"><div className="data-grid"><article className="sim-card"><h3>{copy(locale, "Black-box score", "درجة الصندوق الأسود")}</h3><p>{copy(locale, "Risk: 0.82. No reason shown.", "الخطر: 0.82. لا يظهر سبب.")}</p></article><article className="sim-card"><h3>{copy(locale, "Explainable score", "درجة قابلة للتفسير")}</h3><p>{copy(locale, "Risk: 0.82. Main signals: late inspection + rising vibration. Review limits shown.", "الخطر: 0.82. الإشارات الرئيسية: تأخر الفحص وارتفاع الاهتزاز. تظهر الحدود للمراجعة.")}</p></article></div><label className="field">{copy(locale, "Which output better supports a meaningful human review?", "أي مخرج يدعم مراجعة بشرية ذات معنى بشكل أفضل؟")}<select className="select-input" value={choice} onChange={(e) => setChoice(e.target.value)}><option value="blackbox">{copy(locale, "Black-box score only", "درجة الصندوق الأسود فقط")}</option><option value="explainable">{copy(locale, "Explainable score with limits", "درجة قابلة للتفسير مع حدود")}</option></select></label><p className={`feedback ${choice === "explainable" ? "" : "error"}`} role="status">{choice === "explainable" ? copy(locale, "A reason is useful when it can be checked, challenged, and paired with a right to intervene.", "يكون السبب مفيدًا عندما يمكن فحصه والطعن فيه وربطه بحق التدخل.") : copy(locale, "A numerical score alone does not tell a reviewer what to verify.", "الدرجة الرقمية وحدها لا تخبر المراجع بما يجب التحقق منه.")}</p><Finish locale={locale} onClick={() => onComplete({ choice, correct: choice === "explainable" })} /></div>;
}

function Hearing({ locale, onComplete }: Pick<Props, "locale" | "onComplete">) {
  const people = [["student", "Student: false matches could affect entry and dignity.", "طالب: المطابقات الخاطئة قد تؤثر في الدخول والكرامة."], ["parent", "Parent: asks for appeal, retention limit, and a non-biometric alternative.", "ولي الأمر: يطلب اعتراضًا وحدًا للاحتفاظ وبديلًا غير بيومتري."], ["teacher", "Teacher: needs a reliable, quick attendance process.", "المعلم: يحتاج عملية حضور موثوقة وسريعة."], ["access", "Accessibility advocate: system must not exclude learners who cannot or will not use it.", "مناصر الإتاحة: يجب ألا يستبعد النظام المتعلمين الذين لا يستطيعون أو لا يريدون استخدامه."], ["admin", "Administrator: asks whether a less intrusive method meets the purpose.", "المدير: يسأل هل تحقق طريقة أقل تدخلًا الغرض."]] as const;
  const [heard, setHeard] = useState<string[]>([]); const [decision, setDecision] = useState("pilot");
  const toggle = (id: string) => setHeard((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <div className="simulation-shell"><p className="activity-copy">{copy(locale, "Open at least three stakeholder statements before recording a decision.", "افتح ثلاثة أقوال على الأقل لأصحاب المصلحة قبل تسجيل القرار.")}</p>{people.map(([id, en, ar]) => <label className="option" data-selected={heard.includes(id)} key={id}><input type="checkbox" checked={heard.includes(id)} onChange={() => toggle(id)} /> {locale === "ar" ? ar : en}</label>)}<label className="field">{copy(locale, "Hearing decision", "قرار الجلسة")}<select className="select-input" value={decision} onChange={(e) => setDecision(e.target.value)}><option value="pilot">{copy(locale, "Limited pilot with safeguards", "تجربة محدودة بإجراءات حماية")}</option><option value="alternative">{copy(locale, "Choose a less intrusive alternative", "اختر بديلًا أقل تدخلًا")}</option><option value="reject">{copy(locale, "Do not deploy", "لا تنشر")}</option></select></label><p className={`feedback ${heard.length >= 3 ? "" : "error"}`} role="status">{copy(locale, `${heard.length}/5 perspectives heard. A fair process documents affected people, alternatives, appeal, and accountability.`, `${heard.length}/5 وجهات نظر استمعت إليها. توثق العملية العادلة الأشخاص المتأثرين والبدائل والاعتراض والمساءلة.`)}</p><Finish locale={locale} onClick={() => onComplete({ heard, decision, ready: heard.length >= 3 })} /></div>;
}

export function SimulationRenderer({ block, locale, onComplete }: Props) {
  switch (block.simulationId) {
    case "technology-timeline": return <MoveList locale={locale} onComplete={onComplete} answer={["transistor", "microprocessor", "web", "smartphone", "remote", "edge-ai"]} items={[{ id: "transistor", en: "1947 · Working transistor", ar: "1947 · ترانزستور عامل" }, { id: "microprocessor", en: "1971 · Commercial microprocessor", ar: "1971 · معالج دقيق تجاري" }, { id: "web", en: "1991 · Public web spreads", ar: "1991 · انتشار الويب للعامة" }, { id: "smartphone", en: "2007 · Touchscreen smartphones", ar: "2007 · هواتف ذكية لمسية" }, { id: "remote", en: "2020 · Remote learning expands", ar: "2020 · توسع التعلم عن بعد" }, { id: "edge-ai", en: "2024 · More AI runs on device", ar: "2024 · مهام ذكاء اصطناعي أكثر على الجهاز" }]} />;
    case "moores-law-graph": return <GrowthModel locale={locale} onComplete={onComplete} />;
    case "edge-cloud-latency": return <EdgeCloud locale={locale} onComplete={onComplete} />;
    case "cashless-stakeholder-decision": return <CashlessBudget locale={locale} onComplete={onComplete} />;
    case "ai-ml-dl-hierarchy": return <Hierarchy locale={locale} onComplete={onComplete} />;
    case "rules-vs-learning-sorter": return <Sorter locale={locale} onComplete={onComplete} />;
    case "dataset-coverage": return <Coverage locale={locale} onComplete={onComplete} />;
    case "hallucination-detective": return <Hallucination locale={locale} onComplete={onComplete} />;
    case "recommendation-data": return <Recommendation locale={locale} onComplete={onComplete} />;
    case "industry-mission-map": return <MissionMap locale={locale} onComplete={onComplete} />;
    case "human-oversight-decision": return <Oversight locale={locale} onComplete={onComplete} />;
    case "privacy-library-recommender": return <PrivacyBuilder locale={locale} onComplete={onComplete} />;
    case "hiring-bias": return <Coverage locale={locale} onComplete={onComplete} hiring />;
    case "black-box-explainability": return <Explainability locale={locale} onComplete={onComplete} />;
    case "accountability-mapper": return <MoveList locale={locale} onComplete={onComplete} items={[{ id: "notice", en: "Notice and pause harm", ar: "اكتشاف الضرر وإيقافه" }, { id: "evidence", en: "Review evidence", ar: "مراجعة الأدلة" }, { id: "correct", en: "Correct outcome or system", ar: "تصحيح النتيجة أو النظام" }, { id: "remedy", en: "Provide remedy and appeal", ar: "توفير الجبر والاعتراض" }, { id: "monitor", en: "Monitor the repair", ar: "مراقبة الإصلاح" }]} />;
    case "school-face-recognition-hearing": return <Hearing locale={locale} onComplete={onComplete} />;
  }
}
