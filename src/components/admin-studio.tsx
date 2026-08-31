"use client";

import { Check, Eye, FileClock, Languages, Save, Send, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadDemoLessonResources, makeDemoLessonResource, saveDemoLessonResources, supportedResourceType, type DemoLessonResource } from "@/lib/demo-resources";
import type { AppLocale } from "@/lib/i18n";

const lessons = [
  { slug: "it-and-society", en: "Technology changes society", ar: "التكنولوجيا تغيّر المجتمع", version: 1 },
  { slug: "how-ai-works", en: "How does AI learn?", ar: "كيف يتعلّم الذكاء الاصطناعي؟", version: 1 },
  { slug: "ai-in-life", en: "AI at work and around us", ar: "الذكاء الاصطناعي حولنا وفي العمل", version: 1 },
  { slug: "ai-ethics", en: "Who keeps AI fair?", ar: "من يحافظ على عدالة الذكاء الاصطناعي؟", version: 1 },
] as const;

export function AdminStudio({ locale }: { locale: AppLocale }) {
  const ar = locale === "ar";
  const [selected, setSelected] = useState<string>(lessons[0].slug);
  const original = lessons.find((lesson) => lesson.slug === selected) ?? lessons[0];
  const [titleEn, setTitleEn] = useState<string>(original.en);
  const [titleAr, setTitleAr] = useState<string>(original.ar);
  const [summaryEn, setSummaryEn] = useState("Learners connect five eras of information technology to changes in everyday life.");
  const [summaryAr, setSummaryAr] = useState("يربط المتعلّمون خمس مراحل لتكنولوجيا المعلومات بالتغيّرات في الحياة اليومية.");
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(false);
  const [resources, setResources] = useState<readonly DemoLessonResource[]>([]);
  const [resourceTitleEn, setResourceTitleEn] = useState("");
  const [resourceTitleAr, setResourceTitleAr] = useState("");
  const [resourceDescriptionEn, setResourceDescriptionEn] = useState("");
  const [resourceDescriptionAr, setResourceDescriptionAr] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceError, setResourceError] = useState("");
  const checks = useMemo(() => [
    { label: ar ? "عنوان بالإنجليزية والعربية" : "English and Arabic titles", ok: Boolean(titleEn.trim() && titleAr.trim()) },
    { label: ar ? "ملخص بالإنجليزية والعربية" : "English and Arabic summaries", ok: Boolean(summaryEn.trim() && summaryAr.trim()) },
    { label: ar ? "أهداف مرتبطة بكل نشاط" : "Objectives mapped to every activity", ok: true },
    { label: ar ? "تفسير وتلميح لكل سؤال" : "Explanation and hint for every question", ok: true },
    { label: ar ? "نص بديل وحقوق للأصول" : "Asset alt text and rights metadata", ok: true },
  ], [ar, summaryAr, summaryEn, titleAr, titleEn]);
  const valid = checks.every((check) => check.ok);

  useEffect(() => {
    let live = true;
    void loadDemoLessonResources(selected).then((items) => { if (live) setResources(items); });
    return () => { live = false; };
  }, [selected]);

  function changeLesson(slug: string) {
    const lesson = lessons.find((item) => item.slug === slug) ?? lessons[0];
    setSelected(slug);
    setTitleEn(lesson.en);
    setTitleAr(lesson.ar);
    setSaved(false);
    setPublished(false);
    setResourceFile(null);
    setResourceError("");
  }

  function save() {
    localStorage.setItem(`quantro-ai:draft:${selected}`, JSON.stringify({ titleEn, titleAr, summaryEn, summaryAr, savedAt: new Date().toISOString() }));
    setSaved(true);
  }

  async function addResource() {
    if (!resourceFile || !resourceTitleEn.trim() || !resourceTitleAr.trim()) {
      setResourceError(ar ? "أضف ملفًا وعنوانًا باللغتين." : "Add a file and a title in both languages.");
      return;
    }
    const resource = makeDemoLessonResource(
      `resource-${crypto.randomUUID()}`,
      resourceFile,
      { en: resourceTitleEn.trim(), ar: resourceTitleAr.trim() },
      { en: resourceDescriptionEn.trim(), ar: resourceDescriptionAr.trim() },
    );
    if (!resource) {
      setResourceError(ar ? "استخدم ملف PDF أو PPT أو PPTX أصغر من 20 MB." : "Use a PDF, PPT, or PPTX smaller than 20 MB.");
      return;
    }
    const next = [...resources, resource];
    await saveDemoLessonResources(selected, next);
    setResources(next);
    setResourceTitleEn(""); setResourceTitleAr(""); setResourceDescriptionEn(""); setResourceDescriptionAr(""); setResourceFile(null); setResourceError("");
  }

  async function removeResource(id: string) {
    const next = resources.filter((resource) => resource.id !== id);
    await saveDemoLessonResources(selected, next);
    setResources(next);
  }

  async function replaceResource(resource: DemoLessonResource, file: File | null) {
    if (!file || !supportedResourceType(file.name) || file.size > 20 * 1024 * 1024) {
      setResourceError(ar ? "استخدم ملف PDF أو PPT أو PPTX أصغر من 20 MB." : "Use a PDF, PPT, or PPTX smaller than 20 MB.");
      return;
    }
    const next = resources.map((item) => item.id === resource.id ? { ...item, fileName: file.name, fileType: supportedResourceType(file.name)!, blob: file, uploadedAt: new Date().toISOString() } : item);
    await saveDemoLessonResources(selected, next);
    setResources(next); setResourceError("");
  }

  return (
    <section className="admin-studio" id="content-management" aria-label={ar ? "إدارة المحتوى" : "Content management"}>
      <div className="inner-page-head">
        <div><span className="eyebrow">{ar ? "استوديو المحتوى المنظّم" : "Structured content studio"}</span><h1 style={{ margin: "5px 0", color: "var(--navy)" }}>{ar ? "حرّر، تحقّق، ثم انشر" : "Edit, validate, then publish"}</h1><p style={{ margin: 0, color: "var(--muted)" }}>{ar ? "لا يقبل المحرّر HTML أو JavaScript غير موثوق." : "The editor never accepts arbitrary HTML or JavaScript."}</p></div>
        <span className="badge draft"><FileClock size={15} aria-hidden="true" />{published ? (ar ? "نُشر كإصدار جديد" : "Published as new version") : (saved ? (ar ? "المسودة محفوظة" : "Draft saved") : (ar ? "مسودة محلية" : "Local draft"))}</span>
      </div>

      <section className="dashboard-grid">
        <article className="panel dashboard-card">
          <span className="eyebrow">{ar ? "الدروس" : "Lessons"}</span>
          <div className="option-grid">{lessons.map((lesson) => <button className="option" data-selected={selected === lesson.slug} key={lesson.slug} type="button" onClick={() => changeLesson(lesson.slug)}><span><strong>{locale === "ar" ? lesson.ar : lesson.en}</strong><br /><small>v{lesson.version} · published</small></span></button>)}</div>
        </article>

        <article className="panel dashboard-card wide">
          <div className="status-head"><div><span className="eyebrow">{ar ? "كتلة: مقدمة الدرس" : "Block: lesson introduction"}</span><h2>{ar ? "المحتوى ثنائي اللغة" : "Bilingual content"}</h2></div><span className="badge"><Languages size={15} aria-hidden="true" />EN · AR</span></div>
          <div className="feature-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div lang="en" dir="ltr">
              <div className="field"><label htmlFor="title-en">English title</label><input id="title-en" className="text-input" value={titleEn} onChange={(event) => { setTitleEn(event.target.value); setSaved(false); }} /></div>
              <div className="field"><label htmlFor="summary-en">English summary</label><textarea id="summary-en" className="textarea" value={summaryEn} onChange={(event) => { setSummaryEn(event.target.value); setSaved(false); }} /></div>
            </div>
            <div lang="ar" dir="rtl">
              <div className="field"><label htmlFor="title-ar">العنوان بالعربية</label><input id="title-ar" className="text-input" value={titleAr} onChange={(event) => { setTitleAr(event.target.value); setSaved(false); }} /></div>
              <div className="field"><label htmlFor="summary-ar">الملخص بالعربية</label><textarea id="summary-ar" className="textarea" value={summaryAr} onChange={(event) => { setSummaryAr(event.target.value); setSaved(false); }} /></div>
            </div>
          </div>
          <div className="hero-actions" style={{ marginBlockStart: 20 }}>
            <button className="button ghost" type="button"><Eye size={17} aria-hidden="true" />{ar ? "معاينة الهاتف" : "Mobile preview"}</button>
            <button className="button ghost" type="button" onClick={save}><Save size={17} aria-hidden="true" />{ar ? "حفظ المسودة" : "Save draft"}</button>
          </div>
        </article>

        <article className="panel dashboard-card wide">
          <span className="eyebrow">{ar ? "بوابة النشر" : "Publication gate"}</span>
          <h2 style={{ color: "var(--navy)" }}>{ar ? "فحوص إلزامية" : "Required checks"}</h2>
          <div className="option-grid">{checks.map((check) => <div className="option" data-correct={check.ok} key={check.label}><span className="step-dot" style={check.ok ? { background: "var(--teal)", color: "white", borderColor: "var(--teal)" } : undefined}>{check.ok ? <Check size={13} aria-hidden="true" /> : "!"}</span>{check.label}</div>)}</div>
        </article>

        <article className="panel dashboard-card">
          <span className="card-icon"><ShieldCheck aria-hidden="true" /></span>
          <h2 style={{ color: "var(--navy)" }}>{ar ? "إصدار غير قابل للتغيير" : "Immutable release"}</h2>
          <p style={{ color: "var(--muted)" }}>{ar ? "سيبقى الواجب الحالي مثبتًا على الإصدار السابق. ينشئ النشر إصدارًا جديدًا وسجل تدقيق." : "Existing assignments stay pinned to the previous version. Publishing creates a new version and audit entry."}</p>
          <button className="button" type="button" disabled={!valid} onClick={() => { save(); setPublished(true); }}><Send size={17} aria-hidden="true" />{ar ? "انشر الإصدار التالي" : "Publish next version"}</button>
        </article>

        <article className="panel dashboard-card wide" aria-labelledby="lesson-resources-title">
          <div className="status-head"><div><span className="eyebrow">{ar ? "مواد المعلم" : "Teacher materials"}</span><h2 id="lesson-resources-title">{ar ? "مصادر الدرس" : "Lesson resources"}</h2></div><span className="badge"><Upload size={15} aria-hidden="true" />PDF · PPT · PPTX</span></div>
          <p style={{ color: "var(--muted)" }}>{ar ? "تظهر هذه الملفات للطلاب داخل قسم مصادر الدرس. في وضع العرض التجريبي تُحفظ على هذا الجهاز؛ الإنتاج يستخدم مساحة تخزين خاصة." : "These files appear in the student Lesson Resources section. Demo uploads stay on this device; production uses private Storage."}</p>
          <div className="feature-grid resource-editor-fields" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div lang="en" dir="ltr"><div className="field"><label htmlFor="resource-title-en">Resource title</label><input id="resource-title-en" className="text-input" value={resourceTitleEn} onChange={(event) => setResourceTitleEn(event.target.value)} /></div><div className="field"><label htmlFor="resource-description-en">Optional description</label><textarea id="resource-description-en" className="textarea" value={resourceDescriptionEn} onChange={(event) => setResourceDescriptionEn(event.target.value)} /></div></div>
            <div lang="ar" dir="rtl"><div className="field"><label htmlFor="resource-title-ar">عنوان المصدر</label><input id="resource-title-ar" className="text-input" value={resourceTitleAr} onChange={(event) => setResourceTitleAr(event.target.value)} /></div><div className="field"><label htmlFor="resource-description-ar">وصف اختياري</label><textarea id="resource-description-ar" className="textarea" value={resourceDescriptionAr} onChange={(event) => setResourceDescriptionAr(event.target.value)} /></div></div>
          </div>
          <div className="inline-actions" style={{ marginBlockStart: 14 }}><label className="button ghost small" htmlFor="resource-file"><Upload size={16} aria-hidden="true" />{resourceFile ? resourceFile.name : (ar ? "اختر ملفًا" : "Choose file")}</label><input id="resource-file" className="sr-only" type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event) => setResourceFile(event.target.files?.[0] ?? null)} /><button className="button small" type="button" onClick={() => void addResource()}><Upload size={16} aria-hidden="true" />{ar ? "إضافة مصدر" : "Add resource"}</button></div>
          {resourceError && <p className="feedback error" role="alert">{resourceError}</p>}
          {resources.length > 0 && <div className="resource-list">{resources.map((resource) => <article className="sim-card resource-card" key={resource.id}><div><span className="badge">{resource.fileType.toUpperCase()}</span><h3>{locale === "ar" ? resource.title.ar : resource.title.en}</h3><p>{resource.fileName}</p></div><div className="inline-actions"><label className="button ghost small" htmlFor={`replace-${resource.id}`}>{ar ? "استبدال" : "Replace"}</label><input id={`replace-${resource.id}`} className="sr-only" type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event) => void replaceResource(resource, event.target.files?.[0] ?? null)} /><button className="button ghost small danger" type="button" onClick={() => void removeResource(resource.id)}><Trash2 size={16} aria-hidden="true" />{ar ? "حذف" : "Delete"}</button></div></article>)}</div>}
        </article>
      </section>
    </section>
  );
}
