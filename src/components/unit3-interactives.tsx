"use client";

import { ArrowDown, ArrowUp, CheckCircle2, CircleAlert, Code2, Database, FileText, Laptop, Network, Send, Server, ShieldCheck, Smartphone } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { CurriculumLesson, LessonActivity, LessonChallenge } from "@/content/part1-curriculum";
import type { Locale, LocalizedText } from "@/lib/types";

const t = (locale: Locale, en: string, ar: string) => locale === "ar" ? ar : en;
const pick = (locale: Locale, value: LocalizedText) => value[locale];
const L = (en: string, ar: string): LocalizedText => ({ en, ar });

function ActivityFrame({ activity, locale, complete, children }: { activity: LessonActivity; locale: Locale; complete: boolean; children: ReactNode }) {
  return <article className="panel unit2-activity unit3-activity" data-complete={complete}>
    <div className="unit2-activity-heading"><span className="unit2-activity-icon"><Code2 size={20} /></span><div><span className="eyebrow">{t(locale, "Interactive practice", "تدريب تفاعلي")}</span><h3>{pick(locale, activity.title)}</h3><p>{pick(locale, activity.instruction)}</p></div>{complete && <span className="completion-badge"><CheckCircle2 size={16} />{t(locale, "Completed", "مكتمل")}</span>}</div>
    {children}
  </article>;
}

function Status({ locale, success, children }: { locale: Locale; success: boolean; children: ReactNode }) {
  return <p className={`unit2-status ${success ? "success" : "warning"}`} role="status">{success ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}{children}</p>;
}

function TierFlow({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const stages = [
    { icon: Laptop, title: L("1. A shopper searches", "١. يبحث المتسوق"), detail: L("The frontend collects the words “wireless headphones”.", "تجمع الواجهة الأمامية كلمات «سماعات لاسلكية».") },
    { icon: Send, title: L("2. Frontend sends", "٢. ترسل الواجهة الأمامية"), detail: L("The search action becomes a request for the backend.", "يتحول إجراء البحث إلى طلب للواجهة الخلفية.") },
    { icon: Server, title: L("3. Backend asks", "٣. تطلب الواجهة الخلفية"), detail: L("The backend decides which matching records it needs.", "تقرر الواجهة الخلفية السجلات المطابقة التي تحتاجها.") },
    { icon: Database, title: L("4. Database finds", "٤. تبحث قاعدة البيانات"), detail: L("The database retrieves stored product records.", "تسترجع قاعدة البيانات سجلات المنتجات المخزنة.") },
    { icon: Server, title: L("5. Backend organises", "٥. تنظم الواجهة الخلفية"), detail: L("The backend turns matching records into a useful result.", "تحول الواجهة الخلفية السجلات المطابقة إلى نتيجة مفيدة.") },
    { icon: Send, title: L("6. Response returns", "٦. تعود الاستجابة"), detail: L("The backend sends the product result back to the frontend.", "ترسل الواجهة الخلفية نتيجة المنتج إلى الواجهة الأمامية.") },
    { icon: Laptop, title: L("7. Frontend displays", "٧. تعرض الواجهة الأمامية"), detail: L("The shopper sees the matching products in the browser.", "يرى المتسوق المنتجات المطابقة في المتصفح.") },
  ];
  const [stage, setStage] = useState(0);
  const current = stages[stage];
  const Icon = current.icon;
  const next = () => { if (stage === stages.length - 1) onComplete(); else setStage((value) => value + 1); };
  return <div className="unit3-flow-activity"><ol className="unit3-stage-list" aria-label={t(locale, "Product search flow", "مسار البحث عن منتج")}>{stages.map((item, index) => <li key={item.title.en} data-state={index < stage ? "done" : index === stage ? "active" : "pending"}><span>{index < stage ? <CheckCircle2 size={15} /> : index + 1}</span><strong>{pick(locale, item.title)}</strong></li>)}</ol><section className="unit3-stage-detail" aria-live="polite"><Icon size={32} /><div><strong>{pick(locale, current.title)}</strong><p>{pick(locale, current.detail)}</p></div></section><button className="button secondary" type="button" onClick={next}>{stage === stages.length - 1 ? t(locale, "Finish flow", "إنهاء المسار") : t(locale, "Show next step", "اعرض الخطوة التالية")}</button></div>;
}

function TierClassify({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const rows = [
    { id: "search", text: L("Search button and product cards", "زر البحث وبطاقات المنتجات"), answer: "frontend" },
    { id: "price", text: L("Checks stock and calculates a price", "يفحص المخزون ويحسب السعر"), answer: "backend" },
    { id: "records", text: L("Stores product names and quantities", "يخزن أسماء المنتجات والكميات"), answer: "database" },
  ];
  const options = [L("Choose a tier", "اختر طبقة"), L("Frontend", "الواجهة الأمامية"), L("Backend", "الواجهة الخلفية"), L("Database", "قاعدة البيانات")];
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const correct = rows.every((row) => values[row.id] === row.answer);
  const check = () => { setChecked(true); if (correct) onComplete(); };
  return <div className="unit3-map-activity"><div className="security-map-rows">{rows.map((row) => <label key={row.id}><span>{pick(locale, row.text)}</span><select value={values[row.id] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [row.id]: event.target.value })); setChecked(false); }}><option value="">{pick(locale, options[0])}</option>{["frontend", "backend", "database"].map((id, index) => <option key={id} value={id}>{pick(locale, options[index + 1])}</option>)}</select>{checked && <small className={values[row.id] === row.answer ? "correct" : "incorrect"}>{values[row.id] === row.answer ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}{pick(locale, options[["frontend", "backend", "database"].indexOf(row.answer) + 1])}</small>}</label>)}</div><button className="button secondary" type="button" onClick={check}>{t(locale, "Check tiers", "تحقق من الطبقات")}</button>{checked && <Status locale={locale} success={correct}>{correct ? t(locale, "Correct: the layers have different roles, then work together.", "صحيح: للطبقات أدوار مختلفة ثم تعمل معاً.") : t(locale, "Try again. Ask whether the person sees it, the server processes it, or it stores it.", "حاول مرة أخرى. اسأل: هل يراه الشخص، أم يعالجه الخادم، أم يخزنه؟")}</Status>}</div>;
}

function ClientServerFlow({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const stages = [
    { title: L("Client", "العميل"), detail: L("A browser asks to open /profile.", "يطلب المتصفح فتح /profile."), Icon: Laptop },
    { title: L("Request", "طلب"), detail: L("The message travels to the server.", "تنتقل الرسالة إلى الخادم."), Icon: Send },
    { title: L("Server", "الخادم"), detail: L("The server processes the request.", "يعالج الخادم الطلب."), Icon: Server },
    { title: L("Response", "استجابة"), detail: L("A response returns to the browser to display.", "تعود الاستجابة إلى المتصفح لعرضها."), Icon: Network },
  ];
  const [stage, setStage] = useState(0);
  const current = stages[stage];
  const next = () => { if (stage === stages.length - 1) onComplete(); else setStage((value) => value + 1); };
  return <div className="unit3-flow-activity"><ol className="unit3-stage-list" aria-label={t(locale, "Request and response flow", "مسار الطلب والاستجابة")}>{stages.map((item, index) => <li key={item.title.en} data-state={index < stage ? "done" : index === stage ? "active" : "pending"}><span>{index < stage ? <CheckCircle2 size={15} /> : index + 1}</span><strong>{pick(locale, item.title)}</strong></li>)}</ol><section className="unit3-stage-detail" aria-live="polite"><current.Icon size={32} /><div><strong>{pick(locale, current.title)}</strong><p>{pick(locale, current.detail)}</p></div></section><button className="button secondary" type="button" onClick={next}>{stage === stages.length - 1 ? t(locale, "Finish exchange", "إنهاء التبادل") : t(locale, "Advance the message", "حرّك الرسالة")}</button></div>;
}

function MethodSort({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const rows = [
    { id: "timetable", text: L("Load a published timetable", "حمّل جدولاً منشوراً"), answer: "get" },
    { id: "login", text: L("Send a submitted login form", "أرسل نموذج تسجيل دخول مقدماً"), answer: "post" },
    { id: "results", text: L("Retrieve search results", "استرجع نتائج البحث"), answer: "get" },
    { id: "message", text: L("Send a contact message", "أرسل رسالة اتصال"), answer: "post" },
  ];
  const [values, setValues] = useState<Record<string, string>>({}); const [checked, setChecked] = useState(false);
  const correct = rows.every((row) => values[row.id] === row.answer);
  return <div className="unit3-map-activity"><div className="security-map-rows">{rows.map((row) => <label key={row.id}><span>{pick(locale, row.text)}</span><select value={values[row.id] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [row.id]: event.target.value })); setChecked(false); }}><option value="">{t(locale, "Choose method", "اختر الطريقة")}</option><option value="get">GET</option><option value="post">POST</option></select>{checked && <small className={values[row.id] === row.answer ? "correct" : "incorrect"}>{values[row.id] === row.answer ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}{row.answer.toUpperCase()}</small>}</label>)}</div><button className="button secondary" type="button" onClick={() => { setChecked(true); if (correct) onComplete(); }}>{t(locale, "Check methods", "تحقق من الطرق")}</button>{checked && <Status locale={locale} success={correct}>{correct ? t(locale, "Exactly. GET retrieves; POST sends submitted information.", "بالضبط. تسترجع GET؛ وترسل POST المعلومات المقدمة.") : t(locale, "Look for retrieve versus submit, not for the name of the page.", "ابحث عن الاسترجاع مقابل التقديم، لا عن اسم الصفحة.")}</Status>}</div>;
}

function StatusSimulator({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const scenarios = [
    { id: "success", name: L("Open an existing timetable", "افتح جدولاً موجوداً"), code: "200", explanation: L("The request succeeded and the timetable can be returned.", "نجح الطلب ويمكن إعادة الجدول.") },
    { id: "missing", name: L("Open a page that does not exist", "افتح صفحة غير موجودة"), code: "404", explanation: L("The requested page or resource was not found.", "لم يتم العثور على الصفحة أو المورد المطلوب.") },
    { id: "server", name: L("A server fails while processing", "يفشل خادم أثناء المعالجة"), code: "500", explanation: L("The problem occurred at the server while it handled the request.", "حدثت المشكلة في الخادم أثناء معالجة الطلب.") },
  ];
  const [selected, setSelected] = useState(scenarios[0].id); const [revealed, setRevealed] = useState(false);
  const scenario = scenarios.find((item) => item.id === selected) ?? scenarios[0];
  return <div className="unit3-status-activity"><div className="scenario-tabs">{scenarios.map((item) => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setRevealed(false); }}>{pick(locale, item.name)}</button>)}</div><div className={`unit3-http-code code-${scenario.code}`} aria-live="polite"><strong>{revealed ? scenario.code : "?"}</strong><span>{revealed ? pick(locale, scenario.explanation) : t(locale, "Predict the response status, then reveal it.", "توقع حالة الاستجابة ثم اكشفها.")}</span></div><button className="button secondary" type="button" onClick={() => { setRevealed(true); onComplete(); }}>{t(locale, "Reveal response", "اكشف الاستجابة")}</button></div>;
}

function ApiJsonOrder({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const correct = ["client", "api", "json", "display"];
  const items: Record<string, LocalizedText> = { client: L("Browser asks for today’s weather", "يطلب المتصفح طقس اليوم"), api: L("Backend asks the weather API", "تطلب الواجهة الخلفية API الطقس"), json: L("API returns 200 with JSON data", "تعيد API حالة 200 وبيانات JSON"), display: L("Frontend displays the forecast", "تعرض الواجهة الأمامية التوقع") };
  const [order, setOrder] = useState(["json", "display", "api", "client"]); const [checked, setChecked] = useState(false);
  const valid = order.every((item, index) => item === correct[index]);
  const move = (index: number, change: -1 | 1) => { const next = [...order]; const target = index + change; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setOrder(next); setChecked(false); };
  return <div className="unit3-order-activity"><ol className="final-ordering">{order.map((id, index) => <li key={id}><b>{index + 1}</b><span>{pick(locale, items[id])}</span><div><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={t(locale, "Move earlier", "انقل لأعلى")}><ArrowUp size={15} /></button><button type="button" disabled={index === order.length - 1} onClick={() => move(index, 1)} aria-label={t(locale, "Move later", "انقل لأسفل")}><ArrowDown size={15} /></button></div></li>)}</ol><button className="button secondary" type="button" onClick={() => { setChecked(true); if (valid) onComplete(); }}>{t(locale, "Check API flow", "تحقق من مسار API")}</button>{checked && <Status locale={locale} success={valid}>{valid ? t(locale, "Correct: the application requests a service, receives structured JSON, and then displays it.", "صحيح: يطلب التطبيق خدمة ويتلقى JSON منظماً ثم يعرضه.") : t(locale, "Try again. Start with the browser’s need, then follow the request and response.", "حاول مرة أخرى. ابدأ بحاجة المتصفح، ثم اتبع الطلب والاستجابة.")}</Status>}</div>;
}

function FrontendLayers({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const layers = [
    { id: "html", name: "HTML", role: L("Structure: title, event list, sign-up form", "البنية: عنوان وقائمة فعاليات ونموذج تسجيل") },
    { id: "css", name: "CSS", role: L("Appearance: spacing, colours, readable layout", "المظهر: مسافات وألوان وتخطيط قابل للقراءة") },
    { id: "js", name: "JavaScript", role: L("Behaviour: update a live sign-up total", "السلوك: تحديث إجمالي التسجيل الحي") },
  ];
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((current) => { const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id]; if (next.length === layers.length) onComplete(); return next; });
  return <div className="unit3-layer-activity"><div className="unit3-layer-grid">{layers.map((layer) => <label key={layer.id} data-selected={selected.includes(layer.id)}><input type="checkbox" checked={selected.includes(layer.id)} onChange={() => toggle(layer.id)} /><Code2 size={21} /><strong>{layer.name}</strong><span>{pick(locale, layer.role)}</span></label>)}</div><section className="unit3-preview-card" aria-live="polite"><strong>{t(locale, "Student Club", "النادي الطلابي")}</strong><p>{selected.includes("html") ? t(locale, "Events: Robotics • Reading • Sport", "الفعاليات: روبوتات • قراءة • رياضة") : t(locale, "Add HTML to give the page meaningful content.", "أضف HTML لمنح الصفحة محتوى ذا معنى.")}</p>{selected.includes("js") && <b>{t(locale, "12 learners signed up", "سجل 12 طالباً")}</b>}<small>{selected.includes("css") ? t(locale, "CSS makes this card visually organised.", "يجعل CSS هذه البطاقة منظمة بصرياً.") : t(locale, "Add CSS for a clear, readable appearance.", "أضف CSS لمظهر واضح قابل للقراءة.")}</small></section></div>;
}

function SemanticMap({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const rows = [
    { id: "title", text: L("Site title and club name", "عنوان الموقع واسم النادي"), answer: "header" },
    { id: "links", text: L("Links to Events, About, Contact", "روابط للفعاليات وحول واتصل بنا"), answer: "nav" },
    { id: "story", text: L("The main event article", "مقال الفعالية الرئيسي"), answer: "main" },
    { id: "copyright", text: L("Copyright and school contact", "حقوق النشر واتصال المدرسة"), answer: "footer" },
  ];
  const [values, setValues] = useState<Record<string, string>>({}); const [checked, setChecked] = useState(false);
  const correct = rows.every((row) => values[row.id] === row.answer);
  return <div className="unit3-map-activity"><div className="security-map-rows">{rows.map((row) => <label key={row.id}><span>{pick(locale, row.text)}</span><select value={values[row.id] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [row.id]: event.target.value })); setChecked(false); }}><option value="">{t(locale, "Choose a region", "اختر منطقة")}</option>{["header", "nav", "main", "footer"].map((region) => <option key={region} value={region}>{region}</option>)}</select>{checked && <small className={values[row.id] === row.answer ? "correct" : "incorrect"}>{values[row.id] === row.answer ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}&lt;{row.answer}&gt;</small>}</label>)}</div><button className="button secondary" type="button" onClick={() => { setChecked(true); if (correct) onComplete(); }}>{t(locale, "Check page map", "تحقق من خريطة الصفحة")}</button>{checked && <Status locale={locale} success={correct}>{correct ? t(locale, "Well mapped. Meaningful regions help people and tools understand the page.", "خريطة جيدة. تساعد المناطق ذات المعنى الأشخاص والأدوات على فهم الصفحة.") : t(locale, "Match each region to its purpose on the page.", "طابق كل منطقة مع غرضها في الصفحة.")}</Status>}</div>;
}

function ResponsiveSimulator({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const devices = [
    { id: "desktop", name: L("Desktop", "حاسوب"), note: L("Three readable cards across", "ثلاث بطاقات مقروءة عبر الشاشة") },
    { id: "tablet", name: L("Tablet", "جهاز لوحي"), note: L("Two cards per row", "بطاقتان في كل صف") },
    { id: "phone", name: L("Phone", "هاتف"), note: L("One easy-to-read column", "عمود واحد سهل القراءة") },
  ];
  const [device, setDevice] = useState("desktop"); const [seen, setSeen] = useState<string[]>(["desktop"]);
  const select = (id: string) => { setDevice(id); setSeen((current) => { const next = [...new Set([...current, id])]; if (next.length === devices.length) onComplete(); return next; }); };
  const current = devices.find((item) => item.id === device) ?? devices[0];
  return <div className="unit3-responsive-activity"><div className="scenario-tabs">{devices.map((item) => <button type="button" key={item.id} aria-pressed={device === item.id} onClick={() => select(item.id)}>{item.id === "phone" ? <Smartphone size={15} /> : <Laptop size={15} />}{pick(locale, item.name)}</button>)}</div><section className={`unit3-device-preview device-${device}`} aria-live="polite"><header><span>{pick(locale, current.name)}</span><small>{pick(locale, current.note)}</small></header><div>{["Robotics", "Art", "Sport"].map((name) => <article key={name}><FileText size={15} /><span>{name}</span></article>)}</div></section><p className="unit3-device-hint">{seen.length === devices.length ? <><CheckCircle2 size={16} />{t(locale, "You checked each layout size. Responsive design reflows rather than merely shrinking text.", "تحققت من كل حجم للتخطيط. يعيد التصميم المتجاوب ترتيب العناصر بدلاً من مجرد تصغير النص.")}</> : t(locale, "Switch through all three sizes to compare the reflow.", "بدّل بين الأحجام الثلاثة كلها لمقارنة إعادة الترتيب.")}</p></div>;
}

export function Unit3ActivityRenderer({ activity, locale, complete, onComplete }: { activity: LessonActivity; locale: Locale; complete: boolean; onComplete: (id: string) => void }) {
  const done = () => onComplete(activity.id);
  const content = activity.id === "web-tier-flow" ? <TierFlow locale={locale} onComplete={done} />
    : activity.id === "tier-classify" ? <TierClassify locale={locale} onComplete={done} />
      : activity.id === "client-server-flow" ? <ClientServerFlow locale={locale} onComplete={done} />
        : activity.id === "get-post-sort" ? <MethodSort locale={locale} onComplete={done} />
          : activity.id === "status-simulator" ? <StatusSimulator locale={locale} onComplete={done} />
            : activity.id === "api-json-order" ? <ApiJsonOrder locale={locale} onComplete={done} />
              : activity.id === "frontend-layers" ? <FrontendLayers locale={locale} onComplete={done} />
                : activity.id === "semantic-map" ? <SemanticMap locale={locale} onComplete={done} />
                  : <ResponsiveSimulator locale={locale} onComplete={done} />;
  return <ActivityFrame activity={activity} locale={locale} complete={complete}>{content}</ActivityFrame>;
}

function ChallengeClinic({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({}); const [reason, setReason] = useState(""); const [saved, setSaved] = useState(false);
  const rows = [{ id: "book", text: L("Appointment-booking screen", "شاشة حجز المواعيد"), answer: "frontend" }, { id: "assign", text: L("Choose an available doctor and time", "اختر طبيباً ووقتاً متاحين"), answer: "backend" }, { id: "record", text: L("Store appointment records", "خزّن سجلات المواعيد"), answer: "database" }];
  const correct = rows.every((row) => values[row.id] === row.answer) && reason.trim().length >= 12;
  return <><div className="security-map-rows">{rows.map((row) => <label key={row.id}><span>{pick(locale, row.text)}</span><select value={values[row.id] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [row.id]: event.target.value })); setSaved(false); }}><option value="">{t(locale, "Choose a tier", "اختر طبقة")}</option><option value="frontend">{t(locale, "Frontend", "الواجهة الأمامية")}</option><option value="backend">{t(locale, "Backend", "الواجهة الخلفية")}</option><option value="database">{t(locale, "Database", "قاعدة البيانات")}</option></select></label>)}</div><label className="challenge-writing"><span>{t(locale, "The booking page opens but no available appointments appear. Which tier is clearly working, which route should be investigated, and why should the clinic keep these roles separate?", "تفتح صفحة الحجز لكن لا تظهر مواعيد متاحة. أي طبقة تعمل بوضوح، وأي مسار ينبغي فحصه، ولماذا ينبغي للعيادة فصل هذه الأدوار؟")}</span><textarea value={reason} onChange={(event) => { setReason(event.target.value); setSaved(false); }} /></label><button className="button secondary" type="button" onClick={() => { setSaved(true); if (correct) onComplete(); }}>{t(locale, "Save clinic design", "احفظ تصميم العيادة")}</button>{saved && <Status locale={locale} success={correct}>{correct ? t(locale, "Recorded. The visible frontend is evidence that the backend or data route needs investigation; each role now has a clear responsibility.", "تم التسجيل. الواجهة الأمامية المرئية دليل على أن مسار الواجهة الخلفية أو البيانات يحتاج إلى فحص؛ ولكل دور الآن مسؤولية واضحة.") : t(locale, "Assign all three tiers and add a brief fault diagnosis before saving.", "عيّن الطبقات الثلاث كلها وأضف تشخيصاً مختصراً للعطل قبل الحفظ.")}</Status>}</>;
}

function ChallengeSchoolPortal({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const rows = [{ id: "login", text: L("A submitted sign-in form should use", "يجب أن يستخدم نموذج تسجيل الدخول المقدم"), answer: "post-https" }, { id: "schedule", text: L("Loading a published timetable should use", "يجب أن يستخدم تحميل جدول منشور"), answer: "get" }, { id: "weather", text: L("A weather widget receives forecast data through", "تتلقى أداة الطقس بيانات التوقع عبر"), answer: "api-json" }];
  const [values, setValues] = useState<Record<string, string>>({}); const [reason, setReason] = useState(""); const [saved, setSaved] = useState(false);
  const correct = rows.every((row) => values[row.id] === row.answer) && reason.trim().length >= 12;
  const labels: Record<string, LocalizedText> = { "post-https": L("POST over HTTPS", "POST عبر HTTPS"), get: L("GET", "GET"), "api-json": L("API returning JSON", "API تعيد JSON") };
  return <><div className="security-map-rows">{rows.map((row) => <label key={row.id}><span>{pick(locale, row.text)}</span><select value={values[row.id] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [row.id]: event.target.value })); setSaved(false); }}><option value="">{t(locale, "Choose", "اختر")}</option>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{pick(locale, label)}</option>)}</select></label>)}</div><label className="challenge-writing"><span>{t(locale, "Explain why the login needs HTTPS and why the timetable needs a response from the server.", "اشرح لماذا يحتاج تسجيل الدخول إلى HTTPS ولماذا يحتاج الجدول إلى استجابة من الخادم.")}</span><textarea value={reason} onChange={(event) => { setReason(event.target.value); setSaved(false); }} /></label><button className="button secondary" type="button" onClick={() => { setSaved(true); if (correct) onComplete(); }}>{t(locale, "Save portal plan", "احفظ خطة البوابة")}</button>{saved && <Status locale={locale} success={correct}>{correct ? t(locale, "Recorded. Your plan distinguishes secure submission, retrieval, and structured service data.", "تم التسجيل. تميز خطتك بين التقديم الآمن والاسترجاع وبيانات الخدمة المنظمة.") : t(locale, "Complete the three decisions and write a short explanation.", "أكمل القرارات الثلاثة واكتب شرحاً مختصراً.")}</Status>}</>;
}

function ChallengeClub({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const rows = [{ id: "events", text: L("Event headings and a sign-up form", "عناوين الفعاليات ونموذج التسجيل"), answer: "html" }, { id: "brand", text: L("Brand colours and spacing", "ألوان العلامة والمسافات"), answer: "css" }, { id: "count", text: L("Update a live sign-up count", "حدّث عدد التسجيل الحي"), answer: "js" }, { id: "phone", text: L("Reflow cards for a phone", "أعد ترتيب البطاقات للهاتف"), answer: "responsive" }, { id: "regions", text: L("Describe navigation and main content", "صف التنقل والمحتوى الرئيسي"), answer: "semantic" }];
  const [values, setValues] = useState<Record<string, string>>({}); const [reason, setReason] = useState(""); const [saved, setSaved] = useState(false);
  const correct = rows.every((row) => values[row.id] === row.answer) && reason.trim().length >= 12;
  const labels: Record<string, LocalizedText> = { html: L("HTML", "HTML"), css: L("CSS", "CSS"), js: L("JavaScript", "JavaScript"), responsive: L("Responsive design", "التصميم المتجاوب"), semantic: L("Semantic HTML", "HTML الدلالي") };
  return <><div className="security-map-rows">{rows.map((row) => <label key={row.id}><span>{pick(locale, row.text)}</span><select value={values[row.id] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [row.id]: event.target.value })); setSaved(false); }}><option value="">{t(locale, "Choose a concept", "اختر مفهوماً")}</option>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{pick(locale, label)}</option>)}</select></label>)}</div><label className="challenge-writing"><span>{t(locale, "Why does separating structure, appearance, and behaviour make the page easier to improve?", "لماذا يجعل فصل البنية والمظهر والسلوك الصفحة أسهل للتحسين؟")}</span><textarea value={reason} onChange={(event) => { setReason(event.target.value); setSaved(false); }} /></label><button className="button secondary" type="button" onClick={() => { setSaved(true); if (correct) onComplete(); }}>{t(locale, "Save club plan", "احفظ خطة النادي")}</button>{saved && <Status locale={locale} success={correct}>{correct ? t(locale, "Recorded. The club page can now be structured, styled, interactive, and accessible across devices.", "تم التسجيل. يمكن الآن بناء صفحة النادي وتنسيقها وجعلها تفاعلية ومتاحة عبر الأجهزة.") : t(locale, "Match every need and add a short justification.", "طابق كل حاجة وأضف تبريراً مختصراً.")}</Status>}</>;
}

type Reflection = { transfer: LocalizedText; pairDiscussion: LocalizedText; individualPrompt: LocalizedText };

export function Unit3Challenge({ challenge, reflection, locale, complete, onComplete, reflectionValue, onReflectionChange }: { challenge: LessonChallenge; reflection?: Reflection; locale: Locale; complete: boolean; onComplete: () => void; reflectionValue: string; onReflectionChange: (value: string) => void }) {
  const content = challenge.id === "clinic-tiers" ? <ChallengeClinic locale={locale} onComplete={onComplete} /> : challenge.id === "school-portal-communication" ? <ChallengeSchoolPortal locale={locale} onComplete={onComplete} /> : <ChallengeClub locale={locale} onComplete={onComplete} />;
  return <><article className="panel unit2-challenge unit3-challenge" data-complete={complete}><div className="unit2-challenge-heading"><span><Code2 size={23} /></span><div><span className="eyebrow">{t(locale, "Think as an Engineer", "فكر كمهندس")}</span><h2>{pick(locale, challenge.title)}</h2><p>{pick(locale, challenge.prompt)}</p></div></div><ul>{challenge.successCriteria.map((criterion) => <li key={criterion.en}><CheckCircle2 size={16} />{pick(locale, criterion)}</li>)}</ul>{content}</article>{reflection && <article className="panel unit2-reflection unit3-reflection"><span className="eyebrow">{t(locale, "Transfer & reflect", "نقل وتأمل")}</span><h3>{t(locale, "Apply the idea in a new context", "طبق الفكرة في سياق جديد")}</h3><p>{pick(locale, reflection.transfer)}</p><p className="pair-prompt"><strong>{t(locale, "In-person pair discussion:", "نقاش ثنائي حضوري:")}</strong> {pick(locale, reflection.pairDiscussion)}</p><label><span>{pick(locale, reflection.individualPrompt)}</span><textarea value={reflectionValue} onChange={(event) => onReflectionChange(event.target.value)} placeholder={t(locale, "Write your individual conclusion.", "اكتب خلاصتك الفردية.")} /></label></article>}</>;
}
