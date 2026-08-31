"use client";

import { BookOpenCheck, CheckCircle2, Clock3, Download, FileQuestion, FileText, FolderOpen, LoaderCircle, Plus, Send, Trash2, Upload, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { examAvailability, type GlobalExam, type GlobalExamAnswer, type GlobalExamAttempt, type GlobalExamQuestion, type GlobalResource } from "@/lib/global-content";
import type { AppLocale } from "@/lib/i18n";

type Props = { locale: AppLocale; role: "student" | "teacher" | "admin" };
type QuestionDraft = { id?: string; position: number; type: "mcq" | "true-false"; prompt: { en: string; ar: string }; choices: { id: string; text: { en: string; ar: string } }[]; correctAnswer: string | boolean };
type ExamDraft = { id?: string; title: { en: string; ar: string }; description: { en: string; ar: string }; instructions: { en: string; ar: string }; startAt: string; endAt: string; durationMinutes: number; questions: QuestionDraft[] };

const emptyQuestion = (position: number): QuestionDraft => ({
  position, type: "mcq", prompt: { en: "", ar: "" }, choices: ["a", "b", "c", "d"].map((id) => ({ id, text: { en: "", ar: "" } })), correctAnswer: "a",
});

function localDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function newDraft(): ExamDraft {
  const start = new Date(Date.now() + 5 * 60_000);
  const end = new Date(start.getTime() + 24 * 60 * 60_000);
  return { title: { en: "", ar: "" }, description: { en: "", ar: "" }, instructions: { en: "", ar: "" }, startAt: localDate(start.toISOString()), endAt: localDate(end.toISOString()), durationMinutes: 30, questions: [emptyQuestion(1)] };
}

function value(text: { en: string; ar: string } | undefined, locale: AppLocale) { return text?.[locale] ?? ""; }
function formatDate(date: string, locale: AppLocale) { return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date)); }
function fileIcon(type: GlobalResource["fileType"]) { return type === "pdf" ? "PDF" : type.toUpperCase(); }

const words = {
  en: {
    resources: "Shared teaching materials", resourceIntro: "Approved files shared with every learner in the platform.", studyMaterials: "Study Materials", studyMaterialIntro: "Files shared to support your lessons and revision.", upload: "Upload material", titleEn: "Title in English", titleAr: "Title in Arabic", descriptionEn: "Description in English (optional)", descriptionAr: "Description in Arabic (optional)", file: "PDF, PPT or PPTX · up to 20 MB", chooseFile: "Choose file", dropFile: "Drag a teaching file here", uploadButton: "Upload", by: "Uploaded by", originalFile: "Original file", uploaded: "Uploaded", download: "Download", remove: "Delete", noResources: "No shared materials have been published yet.", noStudyMaterials: "No study materials have been shared yet.",
    exams: "Global examinations", examIntro: "Published exams are available to every eligible student.", createExam: "Create draft exam", noExams: "No examinations are available right now.", draft: "Draft", published: "Published", upcoming: "Upcoming", available: "Available now", missed: "Closed", inProgress: "In progress", submitted: "Submitted", expired: "Time ended", edit: "Edit draft", publish: "Publish to all students", results: "Results", start: "Start exam", continue: "Continue exam", submit: "Submit exam", minutes: "minutes", starts: "Starts", ends: "Ends", duration: "Individual duration", instructions: "Instructions", question: "Question", addQuestion: "Add question", multipleChoice: "Multiple choice", trueFalse: "True / false", option: "Option", correct: "Correct answer", true: "True", false: "False", saveDraft: "Save draft", updateDraft: "Save changes", cancel: "Cancel", openResponses: "Responses from your students", noResults: "No attempts by your students yet.", score: "Score", student: "Student", state: "Status", started: "Started", submittedAt: "Submitted", timeUsed: "Time used", expires: "Time remaining", saving: "Saving…", loading: "Loading…", saved: "Saved", error: "Something went wrong. Please try again.", examNote: "Your answers are saved as you work. You have one attempt.", result: "Your result", points: "points", unavailable: "This exam is not currently available.",
  },
  ar: {
    resources: "مواد تعليمية مشتركة", resourceIntro: "ملفات معتمدة مشتركة مع كل المتعلمين في المنصة.", studyMaterials: "مواد المذاكرة", studyMaterialIntro: "ملفات مشتركة لدعم دروسك ومراجعتك.", upload: "رفع مادة", titleEn: "العنوان بالإنجليزية", titleAr: "العنوان بالعربية", descriptionEn: "الوصف بالإنجليزية (اختياري)", descriptionAr: "الوصف بالعربية (اختياري)", file: "PDF أو PPT أو PPTX · حتى 20 ميجابايت", chooseFile: "اختر ملفًا", dropFile: "اسحب ملفًا تعليميًا إلى هنا", uploadButton: "رفع", by: "رفعه", originalFile: "الملف الأصلي", uploaded: "تاريخ الرفع", download: "تنزيل", remove: "حذف", noResources: "لا توجد مواد مشتركة منشورة حتى الآن.", noStudyMaterials: "لم تتم مشاركة مواد للمذاكرة حتى الآن.",
    exams: "الاختبارات العامة", examIntro: "تتاح الاختبارات المنشورة لكل طالب مؤهل.", createExam: "إنشاء مسودة اختبار", noExams: "لا توجد اختبارات متاحة الآن.", draft: "مسودة", published: "منشور", upcoming: "قادم", available: "متاح الآن", missed: "مغلق", inProgress: "قيد الحل", submitted: "تم التسليم", expired: "انتهى الوقت", edit: "تعديل المسودة", publish: "نشر لكل الطلاب", results: "النتائج", start: "بدء الاختبار", continue: "متابعة الاختبار", submit: "تسليم الاختبار", minutes: "دقيقة", starts: "يبدأ", ends: "ينتهي", duration: "المدة الفردية", instructions: "التعليمات", question: "سؤال", addQuestion: "إضافة سؤال", multipleChoice: "اختيار من متعدد", trueFalse: "صح / خطأ", option: "اختيار", correct: "الإجابة الصحيحة", true: "صح", false: "خطأ", saveDraft: "حفظ المسودة", updateDraft: "حفظ التعديلات", cancel: "إلغاء", openResponses: "إجابات طلابك", noResults: "لا توجد محاولات من طلابك بعد.", score: "الدرجة", student: "الطالب", state: "الحالة", started: "بدأ", submittedAt: "تم التسليم", timeUsed: "الوقت المستغرق", expires: "الوقت المتبقي", saving: "جارٍ الحفظ…", loading: "جارٍ التحميل…", saved: "تم الحفظ", error: "حدث خطأ. حاول مرة أخرى.", examNote: "يتم حفظ إجاباتك أثناء العمل. لديك محاولة واحدة.", result: "نتيجتك", points: "نقاط", unavailable: "هذا الاختبار غير متاح حاليًا.",
  },
} as const;

export function GlobalContentPanels({ locale, role }: Props) {
  const t = words[locale];
  const canManage = role === "teacher" || role === "admin";
  const [resources, setResources] = useState<GlobalResource[]>([]);
  const [exams, setExams] = useState<GlobalExam[]>([]);
  const [attempts, setAttempts] = useState<GlobalExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const [resourceResponse, examResponse] = await Promise.all([fetch("/api/v1/resources", { cache: "no-store" }), fetch("/api/v1/exams", { cache: "no-store" })]);
    if (!resourceResponse.ok || !examResponse.ok) setError(t.error);
    else {
      const [resourcePayload, examPayload] = await Promise.all([resourceResponse.json(), examResponse.json()]);
      setResources(resourcePayload.resources ?? []);
      setExams(examPayload.exams ?? []);
      setAttempts(examPayload.attempts ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []); // The data source is role-protected by the server.

  return <section className="global-content-stack" aria-label={locale === "ar" ? "محتوى المنصة" : "Platform content"}>
    {role === "student"
      ? <><GlobalExams locale={locale} role={role} exams={exams} attempts={attempts} onChange={load} /><SharedResources locale={locale} role={role} resources={resources} canManage={canManage} onChange={load} /></>
      : <><SharedResources locale={locale} role={role} resources={resources} canManage={canManage} onChange={load} /><GlobalExams locale={locale} role={role} exams={exams} attempts={attempts} onChange={load} /></>}
    {loading && <p className="global-content-status"><LoaderCircle className="spin" size={17} />{t.loading}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}

function SharedResources({ locale, role, resources, canManage, onChange }: { locale: AppLocale; role: Props["role"]; resources: GlobalResource[]; canManage: boolean; onChange: () => Promise<void> }) {
  const t = words[locale];
  const studentFacing = role === "student";
  const heading = studentFacing ? t.studyMaterials : t.resources;
  const intro = studentFacing ? t.studyMaterialIntro : t.resourceIntro;
  const emptyText = studentFacing ? t.noStudyMaterials : t.noResources;
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true); setError("");
    const formData = new FormData(form);
    const selectedFile = formData.get("file");
    if ((!(selectedFile instanceof File) || !selectedFile.name) && droppedFile) formData.set("file", droppedFile);
    const response = await fetch("/api/v1/resources", { method: "POST", body: formData });
    setSubmitting(false);
    if (!response.ok) { setError(t.error); return; }
    form.reset(); setDroppedFile(null); setExpanded(false); await onChange();
  }
  async function remove(id: string) {
    if (!window.confirm(locale === "ar" ? "حذف هذه المادة؟" : "Delete this teaching material?")) return;
    const response = await fetch(`/api/v1/resources/${id}`, { method: "DELETE" });
    if (!response.ok) { setError(t.error); return; }
    await onChange();
  }

  return <article id="resources" className="dashboard-surface global-content-panel">
    <div className="card-heading global-content-heading"><div><span className="dashboard-kicker"><FolderOpen size={15} />{heading}</span><h2>{heading}</h2><p>{intro}</p></div>{canManage && <button className="button small" type="button" onClick={() => setExpanded((open) => !open)}><Upload size={16} />{t.upload}</button>}</div>
    {expanded && <form className="global-resource-form" onSubmit={upload}>
      <label>{t.titleEn}<input required name="titleEn" maxLength={4000} /></label><label>{t.titleAr}<input required name="titleAr" maxLength={4000} dir="rtl" /></label>
      <label>{t.descriptionEn}<textarea name="descriptionEn" maxLength={4000} rows={2} /></label><label>{t.descriptionAr}<textarea name="descriptionAr" maxLength={4000} rows={2} dir="rtl" /></label>
      <div className="file-dropzone" data-dragging={dragging} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); setDroppedFile(event.dataTransfer.files.item(0)); }}><Upload size={22} /><strong>{t.dropFile}</strong><span>{t.file}</span><label className="button ghost small">{t.chooseFile}<input name="file" type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event) => setDroppedFile(event.currentTarget.files?.item(0) ?? null)} /></label>{droppedFile && <small>{droppedFile.name}</small>}</div>
      <button className="button" disabled={submitting} type="submit">{submitting ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}{t.uploadButton}</button>
    </form>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {resources.length ? <div className="resource-card-grid">{resources.map((resource) => <article className="resource-file-card" key={resource.id}><span className="resource-file-type"><FileText size={21} /><b>{fileIcon(resource.fileType)}</b></span><div><h3>{value(resource.title, locale)}</h3>{resource.description && <p>{value(resource.description, locale)}</p>}<small>{t.originalFile}: {resource.fileName}</small><small>{t.by} {resource.uploadedByName} · {(resource.fileSize / 1024 / 1024).toFixed(resource.fileSize > 1024 * 1024 ? 1 : 0)} {resource.fileSize > 1024 * 1024 ? "MB" : "KB"}</small><small>{t.uploaded}: {formatDate(resource.createdAt, locale)}</small></div><div className="resource-actions"><a className="button ghost small" href={`/api/v1/resources/${resource.id}/download`}><Download size={16} />{t.download}</a>{resource.canManage && <button className="icon-button danger" onClick={() => void remove(resource.id)} type="button" aria-label={t.remove}><Trash2 size={16} /></button>}</div></article>)}</div> : <Empty icon={<FolderOpen size={26} />} text={emptyText} />}
  </article>;
}

function GlobalExams({ locale, role, exams, attempts, onChange }: { locale: AppLocale; role: Props["role"]; exams: GlobalExam[]; attempts: GlobalExamAttempt[]; onChange: () => Promise<void> }) {
  const t = words[locale];
  const [editor, setEditor] = useState<ExamDraft | null>(null);
  const [selected, setSelected] = useState<GlobalExam | null>(null);
  const [, setNow] = useState(Date.now());
  const canManage = role === "teacher" || role === "admin";
  const labels = { draft: t.draft, published: t.published, archived: t.missed };
  const studentStatus = { upcoming: t.upcoming, available: t.available, "in-progress": t.inProgress, submitted: t.submitted, expired: t.expired, missed: t.missed };

  useEffect(() => {
    if (role !== "student") return;
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [role]);

  function edit(exam: GlobalExam) {
    setSelected(null);
    setEditor({ id: exam.id, title: exam.title, description: exam.description ?? { en: "", ar: "" }, instructions: exam.instructions ?? { en: "", ar: "" }, startAt: localDate(exam.startAt), endAt: localDate(exam.endAt), durationMinutes: exam.durationMinutes, questions: (exam.questions ?? []).map((question) => ({ id: question.id, position: question.position, type: question.type, prompt: question.prompt, choices: [...question.choices], correctAnswer: question.correctAnswer ?? (question.type === "true-false" ? true : question.choices[0]?.id ?? "a") })) });
  }

  return <article id="exams" className="dashboard-surface global-content-panel">
    <div className="card-heading global-content-heading"><div><span className="dashboard-kicker"><FileQuestion size={15} />{t.exams}</span><h2>{t.exams}</h2><p>{t.examIntro}</p></div>{canManage && <button className="button small" type="button" onClick={() => { setSelected(null); setEditor(newDraft()); }}><Plus size={16} />{t.createExam}</button>}</div>
    {editor && <ExamEditor locale={locale} draft={editor} onCancel={() => setEditor(null)} onSaved={async () => { setEditor(null); await onChange(); }} />}
    {selected && <StudentExam locale={locale} exam={selected} onClose={() => setSelected(null)} />}
    {!editor && !selected && (exams.length ? <div className="exam-card-grid">{exams.map((exam) => { const availability = role === "student" ? examAvailability(exam, attempts.find((attempt) => attempt.examId === exam.id)) : null; const label = availability ? studentStatus[availability] : labels[exam.status]; return <article className="exam-summary-card" key={exam.id}><div className="exam-summary-head"><span className={`exam-status status-${availability ?? exam.status}`}>{label}</span><Clock3 size={18} /></div><h3>{value(exam.title, locale)}</h3>{exam.description && <p>{value(exam.description, locale)}</p>}<dl><div><dt>{t.starts}</dt><dd>{formatDate(exam.startAt, locale)}</dd></div><div><dt>{t.duration}</dt><dd>{exam.durationMinutes} {t.minutes}</dd></div></dl><div className="exam-card-actions">{exam.canManage && exam.status === "draft" && <><button className="button ghost small" type="button" onClick={() => void loadAndEdit(exam.id, edit)}>{t.edit}</button><PublishButton locale={locale} examId={exam.id} onPublished={onChange} /></>}{exam.canManage && exam.status === "published" && <TeacherResults locale={locale} examId={exam.id} />}{role === "student" && exam.status === "published" && <button className="button small" type="button" onClick={() => setSelected(exam)}><BookOpenCheck size={16} />{availability === "in-progress" ? t.continue : t.start}</button>}</div></article>; })}</div> : <Empty icon={<FileQuestion size={27} />} text={t.noExams} />)}
  </article>;
}

async function loadAndEdit(id: string, edit: (exam: GlobalExam) => void) {
  const response = await fetch(`/api/v1/exams/${id}`, { cache: "no-store" });
  if (response.ok) edit((await response.json()).exam);
}

function PublishButton({ locale, examId, onPublished }: { locale: AppLocale; examId: string; onPublished: () => Promise<void> }) {
  const t = words[locale]; const [working, setWorking] = useState(false);
  return <button className="button small" disabled={working} type="button" onClick={async () => { setWorking(true); const response = await fetch(`/api/v1/exams/${examId}/publish`, { method: "POST" }); setWorking(false); if (response.ok) await onPublished(); else window.alert(t.error); }}>{working && <LoaderCircle className="spin" size={15} />}{t.publish}</button>;
}

function ExamEditor({ locale, draft, onCancel, onSaved }: { locale: AppLocale; draft: ExamDraft; onCancel: () => void; onSaved: () => Promise<void> }) {
  const t = words[locale]; const [form, setForm] = useState(draft); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");
  const updateQuestion = (index: number, next: QuestionDraft) => setForm((current) => ({ ...current, questions: current.questions.map((question, questionIndex) => questionIndex === index ? next : question) }));
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSubmitting(true); setError("");
    const payload = { ...form, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() };
    const response = await fetch(form.id ? `/api/v1/exams/${form.id}` : "/api/v1/exams", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitting(false); if (!response.ok) { setError(t.error); return; } await onSaved();
  }
  return <form className="exam-editor" onSubmit={save}><div className="editor-field-grid"><label>{t.titleEn}<input required value={form.title.en} onChange={(event) => setForm({ ...form, title: { ...form.title, en: event.target.value } })} /></label><label>{t.titleAr}<input required dir="rtl" value={form.title.ar} onChange={(event) => setForm({ ...form, title: { ...form.title, ar: event.target.value } })} /></label><label>{t.descriptionEn}<textarea rows={2} value={form.description.en} onChange={(event) => setForm({ ...form, description: { ...form.description, en: event.target.value } })} /></label><label>{t.descriptionAr}<textarea rows={2} dir="rtl" value={form.description.ar} onChange={(event) => setForm({ ...form, description: { ...form.description, ar: event.target.value } })} /></label><label>{t.instructions}<textarea rows={2} value={form.instructions.en} onChange={(event) => setForm({ ...form, instructions: { ...form.instructions, en: event.target.value } })} /></label><label>{locale === "ar" ? "التعليمات بالعربية" : "Instructions in Arabic"}<textarea rows={2} dir="rtl" value={form.instructions.ar} onChange={(event) => setForm({ ...form, instructions: { ...form.instructions, ar: event.target.value } })} /></label><label>{t.starts}<input required type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} /></label><label>{t.ends}<input required type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} /></label><label>{t.duration}<input required type="number" min="1" max="360" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></label></div>
    <div className="editor-question-list">{form.questions.map((question, index) => <QuestionEditor key={question.id ?? index} locale={locale} question={question} onChange={(next) => updateQuestion(index, next)} onRemove={form.questions.length > 1 ? () => setForm({ ...form, questions: form.questions.filter((_, questionIndex) => questionIndex !== index).map((item, position) => ({ ...item, position: position + 1 })) }) : undefined} />)}</div>
    <div className="editor-actions"><button className="button ghost small" type="button" onClick={() => setForm({ ...form, questions: [...form.questions, emptyQuestion(form.questions.length + 1)] })}><Plus size={16} />{t.addQuestion}</button><span /><button className="button ghost small" type="button" onClick={onCancel}>{t.cancel}</button><button className="button" disabled={submitting} type="submit">{submitting ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}{form.id ? t.updateDraft : t.saveDraft}</button></div>{error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}

function QuestionEditor({ locale, question, onChange, onRemove }: { locale: AppLocale; question: QuestionDraft; onChange: (value: QuestionDraft) => void; onRemove?: () => void }) {
  const t = words[locale];
  return <fieldset className="question-editor"><legend>{t.question} {question.position}</legend><div className="question-editor-toolbar"><select value={question.type} onChange={(event) => onChange({ ...question, type: event.target.value as QuestionDraft["type"], correctAnswer: event.target.value === "true-false" ? true : question.choices[0]?.id ?? "a" })}><option value="mcq">{t.multipleChoice}</option><option value="true-false">{t.trueFalse}</option></select>{onRemove && <button className="icon-button danger" type="button" onClick={onRemove} aria-label={t.remove}><Trash2 size={16} /></button>}</div><div className="editor-field-grid"><label>{t.titleEn}<textarea required rows={2} value={question.prompt.en} onChange={(event) => onChange({ ...question, prompt: { ...question.prompt, en: event.target.value } })} /></label><label>{t.titleAr}<textarea required rows={2} dir="rtl" value={question.prompt.ar} onChange={(event) => onChange({ ...question, prompt: { ...question.prompt, ar: event.target.value } })} /></label></div>{question.type === "mcq" ? <div className="choice-editor-grid">{question.choices.map((choice) => <label key={choice.id} className="choice-editor"><input type="radio" checked={question.correctAnswer === choice.id} onChange={() => onChange({ ...question, correctAnswer: choice.id })} aria-label={`${t.correct}: ${choice.id}`} /><span>{choice.id.toUpperCase()}</span><input required placeholder={`${t.option} ${choice.id.toUpperCase()} (EN)`} value={choice.text.en} onChange={(event) => onChange({ ...question, choices: question.choices.map((item) => item.id === choice.id ? { ...item, text: { ...item.text, en: event.target.value } } : item) })} /><input required dir="rtl" placeholder={`${t.option} ${choice.id.toUpperCase()} (AR)`} value={choice.text.ar} onChange={(event) => onChange({ ...question, choices: question.choices.map((item) => item.id === choice.id ? { ...item, text: { ...item.text, ar: event.target.value } } : item) })} /></label>)}</div> : <div className="true-false-control"><span>{t.correct}</span><label><input type="radio" checked={question.correctAnswer === true} onChange={() => onChange({ ...question, correctAnswer: true })} />{t.true}</label><label><input type="radio" checked={question.correctAnswer === false} onChange={() => onChange({ ...question, correctAnswer: false })} />{t.false}</label></div>}</fieldset>;
}

function StudentExam({ locale, exam, onClose }: { locale: AppLocale; exam: GlobalExam; onClose: () => void }) {
  const t = words[locale]; const [detail, setDetail] = useState<GlobalExam | null>(null); const [attempt, setAttempt] = useState<GlobalExamAttempt | null>(null); const [answers, setAnswers] = useState<GlobalExamAnswer[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [now, setNow] = useState(Date.now()); const [error, setError] = useState("");
  async function load() { setLoading(true); const [examRes, attemptRes] = await Promise.all([fetch(`/api/v1/exams/${exam.id}`, { cache: "no-store" }), fetch(`/api/v1/exams/${exam.id}/attempt`, { cache: "no-store" })]); if (!examRes.ok || !attemptRes.ok) setError(t.error); else { const [examData, attemptData] = await Promise.all([examRes.json(), attemptRes.json()]); setDetail(examData.exam); setAttempt(attemptData.attempt); setAnswers(attemptData.attempt?.answers ?? []); } setLoading(false); }
  useEffect(() => { void load(); }, [exam.id]);
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
  const available = new Date(exam.startAt).getTime() <= now && new Date(exam.endAt).getTime() > now;
  const remaining = attempt?.status === "in_progress" ? Math.max(0, new Date(attempt.effectiveExpiresAt).getTime() - now) : 0;
  const time = `${Math.floor(remaining / 60_000)}:${String(Math.floor((remaining % 60_000) / 1000)).padStart(2, "0")}`;
  const answerFor = (questionId: string) => answers.find((answer) => answer.questionId === questionId)?.answer;
  async function start() {
    const confirmation = locale === "ar"
      ? `لديك ${exam.durationMinutes} دقيقة. يبدأ الوقت عند البدء ولا يمكن إيقافه. هل تريد بدء الاختبار؟`
      : `You have ${exam.durationMinutes} minutes. The timer starts now and cannot be paused. Start this exam?`;
    if (!window.confirm(confirmation)) return;
    const response = await fetch(`/api/v1/exams/${exam.id}/attempt`, { method: "POST" });
    if (!response.ok) { setError(t.unavailable); return; }
    const payload = await response.json(); setAttempt(payload.attempt);
  }
  async function setAnswer(questionId: string, answer: string | boolean) { const next = [...answers.filter((item) => item.questionId !== questionId), { questionId, answer }]; setAnswers(next); setSaving(true); const response = await fetch(`/api/v1/exams/${exam.id}/attempt/answers`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: next }) }); setSaving(false); if (!response.ok) { setError(t.error); await load(); } }
  async function submit() { setSaving(true); const response = await fetch(`/api/v1/exams/${exam.id}/attempt/submit`, { method: "POST" }); setSaving(false); if (!response.ok) { setError(t.error); return; } setAttempt((await response.json()).attempt); }
  if (loading) return <p className="global-content-status"><LoaderCircle className="spin" size={17} />{t.loading}</p>;
  const questions = detail?.questions ?? [];
  return <section className="student-exam-player"><div className="player-head"><div><button className="text-action" type="button" onClick={onClose}>← {locale === "ar" ? "العودة" : "Back"}</button><h3>{value(exam.title, locale)}</h3>{detail?.instructions && <p>{value(detail.instructions, locale)}</p>}</div>{attempt?.status === "in_progress" && <strong className="exam-timer"><Clock3 size={17} />{t.expires}: {time}</strong>}</div>{error && <p className="form-error" role="alert">{error}</p>}{!attempt && <div className="exam-start-state"><p>{t.examNote}</p><button className="button" disabled={!available} type="button" onClick={() => void start()}><BookOpenCheck size={16} />{available ? t.start : t.unavailable}</button></div>}{attempt?.status === "in_progress" && <><div className="student-question-list">{questions.map((question) => <StudentQuestion key={question.id} locale={locale} question={question} answer={answerFor(question.id)} onAnswer={(answer) => void setAnswer(question.id, answer)} />)}</div><div className="exam-submit-row"><span>{saving ? t.saving : t.examNote}</span><button className="button" disabled={saving || remaining <= 0} type="button" onClick={() => void submit()}><Send size={16} />{t.submit}</button></div></>}{attempt && attempt.status !== "in_progress" && <div className="exam-result"><CheckCircle2 size={28} /><div><strong>{attempt.status === "submitted" ? t.result : t.expired}</strong>{attempt.score !== null && <p>{attempt.score} / {attempt.maxScore} {t.points}</p>}</div></div>}</section>;
}

function StudentQuestion({ locale, question, answer, onAnswer }: { locale: AppLocale; question: GlobalExamQuestion; answer: string | boolean | null | undefined; onAnswer: (answer: string | boolean) => void }) {
  const t = words[locale];
  return <fieldset className="student-exam-question"><legend>{t.question} {question.position}</legend><h4>{value(question.prompt, locale)}</h4>{question.type === "mcq" ? <div>{question.choices.map((choice) => <label className="student-answer-choice" key={choice.id}><input type="radio" name={question.id} checked={answer === choice.id} onChange={() => onAnswer(choice.id)} /><span>{choice.id.toUpperCase()}</span>{value(choice.text, locale)}</label>)}</div> : <div className="true-false-control">{[true, false].map((item) => <label key={String(item)}><input type="radio" name={question.id} checked={answer === item} onChange={() => onAnswer(item)} />{item ? t.true : t.false}</label>)}</div>}</fieldset>;
}

function TeacherResults({ locale, examId }: { locale: AppLocale; examId: string }) {
  const t = words[locale]; const [open, setOpen] = useState(false); const [results, setResults] = useState<{ id: string; studentName: string; status: string; score: number | null; maxScore: number | null; startedAt: string; submittedAt: string | null; timeTakenSeconds: number | null }[]>([]);
  async function toggle() { const next = !open; setOpen(next); if (next) { const response = await fetch(`/api/v1/exams/${examId}/results`, { cache: "no-store" }); if (response.ok) setResults((await response.json()).results ?? []); } }
  return <div className="teacher-results"><button className="button ghost small" type="button" onClick={() => void toggle()}><UsersRound size={16} />{t.results}</button>{open && <div className="results-popover"><h4>{t.openResponses}</h4>{results.length ? <ul>{results.map((result) => <li key={result.id}><span>{result.studentName}<small>{result.status} · {t.started}: {formatDate(result.startedAt, locale)}</small>{result.submittedAt && <small>{t.submittedAt}: {formatDate(result.submittedAt, locale)} · {t.timeUsed}: {result.timeTakenSeconds === null ? "—" : `${Math.floor(result.timeTakenSeconds / 60)}:${String(result.timeTakenSeconds % 60).padStart(2, "0")}`}</small>}</span><b>{result.score ?? "—"}/{result.maxScore ?? "—"}</b></li>)}</ul> : <p>{t.noResults}</p>}</div>}</div>;
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="global-empty">{icon}<p>{text}</p></div>; }
