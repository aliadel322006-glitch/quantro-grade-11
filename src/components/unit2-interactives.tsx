"use client";

import { ArrowDown, ArrowUp, CheckCircle2, CircleAlert, Fingerprint, KeyRound, Laptop, LockKeyhole, Network, Router, Server, ShieldCheck, Smartphone, Wifi } from "lucide-react";
import { useMemo, useState } from "react";
import type { LessonActivity, LessonChallenge, UnitReview, UnitReviewQuestion } from "@/content/part1-curriculum";
import type { Locale, LocalizedText } from "@/lib/types";

const text = (locale: Locale, en: string, ar: string) => locale === "ar" ? ar : en;
const pick = (locale: Locale, value: LocalizedText) => value[locale];

export type SavedUnit2Mistake = {
  id: string;
  questionId: string;
  question: LocalizedText;
  learnerAnswer: string;
  correctAnswer: string;
  explanation: LocalizedText;
  source: "unit-review";
};

function ActivityFrame({ activity, locale, complete, children }: { activity: LessonActivity; locale: Locale; complete: boolean; children: React.ReactNode }) {
  return <article className="panel unit2-activity" data-complete={complete}>
    <div className="unit2-activity-heading"><span className="unit2-activity-icon"><ShieldCheck size={20} /></span><div><span className="eyebrow">{text(locale, "Interactive practice", "تدريب تفاعلي")}</span><h3>{pick(locale, activity.title)}</h3><p>{pick(locale, activity.instruction)}</p></div>{complete && <span className="completion-badge"><CheckCircle2 size={16} />{text(locale, "Completed", "مكتمل")}</span>}</div>
    {children}
  </article>;
}

function Status({ locale, message, success }: { locale: Locale; message: string; success: boolean }) {
  return <p className={`unit2-status ${success ? "success" : "warning"}`} role="status">{success ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}{message}</p>;
}

function HttpsHandshake({ locale, complete, onComplete }: { locale: Locale; complete: boolean; onComplete: () => void }) {
  const stages = [
    { title: L("1. Check the service identity", "١. تحقق من هوية الخدمة"), detail: L("The browser receives the certificate and public key, then checks the certificate chain.", "يتلقى المتصفح الشهادة والمفتاح العام ثم يتحقق من سلسلة الشهادات."), Icon: Server },
    { title: L("2. Establish a session secret", "٢. أنشئ سر الجلسة"), detail: L("Public-key cryptography helps establish a shared session key without publishing it.", "يساعد التشفير بالمفتاح العام على إنشاء مفتاح جلسة مشترك من دون نشره."), Icon: KeyRound },
    { title: L("3. Confirm protected setup", "٣. أكد الإعداد المحمي"), detail: L("Both sides can now use the agreed secret for this connection.", "يمكن للطرفين الآن استخدام السر المتفق عليه لهذا الاتصال."), Icon: LockKeyhole },
    { title: L("4. Exchange protected data", "٤. تبادل البيانات المحمية"), detail: L("The shared symmetric key efficiently protects the ongoing messages.", "يحمي المفتاح المتماثل المشترك الرسائل المستمرة بكفاءة."), Icon: Network },
  ];
  const [stage, setStage] = useState(0);
  const current = stages[stage];
  const advance = () => {
    if (stage === stages.length - 1) { onComplete(); return; }
    setStage((value) => value + 1);
  };
  const Icon = current.Icon;
  return <div className="https-activity">
    <ol className="https-stage-list" aria-label={text(locale, "HTTPS connection stages", "مراحل اتصال HTTPS")}>{stages.map((item, index) => <li key={item.title.en} data-state={index < stage || complete ? "done" : index === stage ? "active" : "pending"}><span>{index < stage || complete ? <CheckCircle2 size={16} /> : index + 1}</span><strong>{pick(locale, item.title)}</strong></li>)}</ol>
    <section className="https-stage-detail" aria-live="polite"><Icon size={30} /><div><strong>{pick(locale, current.title)}</strong><p>{pick(locale, current.detail)}</p></div></section>
    <button className="button secondary" type="button" onClick={advance}>{stage === stages.length - 1 ? text(locale, "Finish connection", "إنهاء الاتصال") : text(locale, "Next stage", "المرحلة التالية")}</button>
  </div>;
}

function SecurityTechnologyMap({ locale, complete, onComplete }: { locale: Locale; complete: boolean; onComplete: () => void }) {
  const rows = [
    { id: "private", need: L("Keep the message content unreadable to observers", "اجعل محتوى الرسالة غير قابل للقراءة للمراقبين"), answer: "encryption", label: L("Encryption", "التشفير") },
    { id: "identity", need: L("Check that a web service is the intended service", "تحقق أن خدمة الويب هي الخدمة المقصودة"), answer: "certificate", label: L("Digital certificate", "الشهادة الرقمية") },
    { id: "changed", need: L("Detect whether a signed message was changed", "اكشف ما إذا كانت رسالة موقعة قد عُدلت"), answer: "signature", label: L("Digital signature", "التوقيع الرقمي") },
    { id: "login", need: L("Make a leaked password less useful for sign-in", "اجعل كلمة المرور المسربة أقل فائدة لتسجيل الدخول"), answer: "mfa", label: L("Multi-factor authentication", "المصادقة متعددة العوامل") },
  ];
  const options = [{ id: "", label: L("Choose a control", "اختر ضابطاً") }, { id: "encryption", label: L("Encryption", "التشفير") }, { id: "certificate", label: L("Digital certificate", "الشهادة الرقمية") }, { id: "signature", label: L("Digital signature", "التوقيع الرقمي") }, { id: "mfa", label: L("Multi-factor authentication", "المصادقة متعددة العوامل") }];
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const correct = rows.every((row) => values[row.id] === row.answer);
  const check = () => { setChecked(true); if (correct) onComplete(); };
  return <div className="security-map-activity"><div className="security-map-rows">{rows.map((row) => <label key={row.id}><span>{pick(locale, row.need)}</span><select value={values[row.id] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [row.id]: event.target.value })); setChecked(false); }}><option value="">{pick(locale, options[0].label)}</option>{options.slice(1).map((option) => <option key={option.id} value={option.id}>{pick(locale, option.label)}</option>)}</select>{checked && <small className={values[row.id] === row.answer ? "correct" : "incorrect"}>{values[row.id] === row.answer ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}{pick(locale, row.label)}</small>}</label>)}</div><button className="button secondary" type="button" onClick={check}>{text(locale, "Check map", "تحقق من الخريطة")}</button>{checked && <Status locale={locale} success={correct} message={correct ? text(locale, "Excellent — each protection has a distinct job.", "ممتاز — لكل وسيلة حماية وظيفة مختلفة.") : text(locale, "Try again: look for the job each control performs, not a similar word.", "حاول مرة أخرى: ابحث عن وظيفة كل ضابط لا عن كلمة مشابهة.")} />}</div>;
}

function FirewallFilter({ locale, complete, onComplete }: { locale: Locale; complete: boolean; onComplete: () => void }) {
  const scenarios = [
    { id: "web", request: L("Internet visitor → public web server on HTTPS", "زائر من الإنترنت ← خادم ويب عام عبر HTTPS"), answer: "allow", reason: L("Allow: the public web service needs this controlled route.", "اسمح: تحتاج خدمة الويب العامة إلى هذا المسار المضبوط.") },
    { id: "database", request: L("Internet visitor → internal student database", "زائر من الإنترنت ← قاعدة بيانات الطلاب الداخلية"), answer: "block", reason: L("Block: visitors should not directly reach the confidential database.", "امنع: لا ينبغي للزوار الوصول مباشرة إلى قاعدة البيانات السرية.") },
    { id: "remote", request: L("Verified remote staff member → VPN gateway", "موظف عن بعد تم التحقق منه ← بوابة VPN"), answer: "allow", reason: L("Allow after verification: the VPN is the approved protected route.", "اسمح بعد التحقق: VPN هي المسار المحمي المعتمد.") },
  ];
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [decision, setDecision] = useState("");
  const [checked, setChecked] = useState(false);
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const correct = decision === scenario.answer;
  const check = () => { setChecked(true); if (correct) onComplete(); };
  return <div className="firewall-activity"><fieldset><legend>{text(locale, "Traffic request", "طلب حركة")}</legend><div className="scenario-tabs">{scenarios.map((item) => <button type="button" key={item.id} aria-pressed={item.id === scenarioId} onClick={() => { setScenarioId(item.id); setDecision(""); setChecked(false); }}>{text(locale, item.id === "web" ? "Public site" : item.id === "database" ? "Database" : "Remote work", item.id === "web" ? "الموقع العام" : item.id === "database" ? "قاعدة البيانات" : "العمل عن بعد")}</button>)}</div><p className="traffic-request"><Network size={22} />{pick(locale, scenario.request)}</p><div className="decision-options" role="radiogroup" aria-label={pick(locale, scenario.request)}>{["allow", "block"].map((option) => <label key={option}><input type="radio" name="firewall-decision" checked={decision === option} onChange={() => { setDecision(option); setChecked(false); }} />{text(locale, option === "allow" ? "Allow traffic" : "Block traffic", option === "allow" ? "اسمح بالحركة" : "امنع الحركة")}</label>)}</div></fieldset><button className="button secondary" type="button" onClick={check} disabled={!decision}>{text(locale, "Apply rule", "طبق القاعدة")}</button>{checked && <Status locale={locale} success={correct} message={correct ? pick(locale, scenario.reason) : text(locale, "Re-read the asset and route. A public path and a confidential path should not receive the same rule.", "أعد قراءة الأصل والمسار. لا ينبغي أن يحصل المسار العام والمسار السري على القاعدة نفسها.")} />}</div>;
}

function DefenseLayers({ locale, complete, onComplete }: { locale: Locale; complete: boolean; onComplete: () => void }) {
  const layers = [
    { id: "firewall", Icon: Router, name: L("Firewall", "جدار الحماية"), role: L("filters entry and exit traffic", "يرشح حركة الدخول والخروج") },
    { id: "vpn", Icon: Wifi, name: L("VPN", "VPN"), role: L("protects the remote path", "تحمي المسار عن بعد") },
    { id: "dmz", Icon: Server, name: L("DMZ", "DMZ"), role: L("separates a public server", "تفصل خادماً عاماً") },
    { id: "endpoint", Icon: Laptop, name: L("Endpoint protection", "حماية نقاط النهاية"), role: L("keeps each device healthier", "تحافظ على سلامة كل جهاز") },
    { id: "verify", Icon: Fingerprint, name: L("Zero trust", "الثقة الصفرية"), role: L("verifies important access", "تتحقق من الوصول المهم") },
  ];
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const correct = layers.every((layer) => selected.includes(layer.id));
  const toggle = (id: string) => { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); setChecked(false); };
  return <div className="defense-activity"><p>{text(locale, "Select every layer a company should combine for its public site, remote staff, and records.", "حدد كل الطبقات التي ينبغي للشركة جمعها لموقعها العام وموظفيها عن بعد وسجلاتها.")}</p><div className="defense-layer-grid">{layers.map((layer) => { const Icon = layer.Icon; return <label key={layer.id} data-selected={selected.includes(layer.id)}><input type="checkbox" checked={selected.includes(layer.id)} onChange={() => toggle(layer.id)} /><Icon size={21} /><strong>{pick(locale, layer.name)}</strong><span>{pick(locale, layer.role)}</span></label>; })}</div><button className="button secondary" type="button" onClick={() => { setChecked(true); if (correct) onComplete(); }}>{text(locale, "Check design", "تحقق من التصميم")}</button>{checked && <Status locale={locale} success={correct} message={correct ? text(locale, "A layered design gives another control a chance to limit harm.", "يمنح التصميم المتداخل ضابطاً آخر فرصة للحد من الضرر.") : text(locale, "This scenario needs every listed layer; each one protects a different route or weakness.", "يحتاج هذا السيناريو إلى كل الطبقات المدرجة؛ فكل منها تحمي مساراً أو ضعفاً مختلفاً.")} />}</div>;
}

function IncidentOrder({ locale, complete, onComplete }: { locale: Locale; complete: boolean; onComplete: () => void }) {
  const initial = ["prevent", "recover", "eradicate", "contain", "detect", "prepare"];
  const terms: Record<string, LocalizedText> = { prepare: L("Preparation", "الاستعداد"), detect: L("Detection", "الاكتشاف"), contain: L("Containment", "الاحتواء"), eradicate: L("Eradication", "الاستئصال"), recover: L("Recovery", "الاستعادة"), prevent: L("Prevention of recurrence", "منع التكرار") };
  const correctOrder = ["prepare", "detect", "contain", "eradicate", "recover", "prevent"];
  const [order, setOrder] = useState(initial);
  const [checked, setChecked] = useState(false);
  const isCorrect = order.every((value, index) => value === correctOrder[index]);
  const move = (index: number, direction: -1 | 1) => { const next = [...order]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setOrder(next); setChecked(false); };
  return <div className="incident-order-activity"><ol>{order.map((item, index) => <li key={item}><span>{index + 1}</span><strong>{pick(locale, terms[item])}</strong><div><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={text(locale, `Move ${pick(locale, terms[item])} earlier`, `انقل ${pick(locale, terms[item])} لأعلى`)}><ArrowUp size={16} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === order.length - 1} aria-label={text(locale, `Move ${pick(locale, terms[item])} later`, `انقل ${pick(locale, terms[item])} لأسفل`)}><ArrowDown size={16} /></button></div></li>)}</ol><button className="button secondary" type="button" onClick={() => { setChecked(true); if (isCorrect) onComplete(); }}>{text(locale, "Check order", "تحقق من الترتيب")}</button>{checked && <Status locale={locale} success={isCorrect} message={isCorrect ? text(locale, "Correct. Preparation starts before the incident; containment precedes eradication and recovery.", "صحيح. يبدأ الاستعداد قبل الحادث؛ ويسبق الاحتواء الاستئصال والاستعادة.") : text(locale, "Try again. Think about preventing spread before removing the cause, and removing the cause before recovery.", "حاول مرة أخرى. فكر في منع الانتشار قبل إزالة السبب وإزالة السبب قبل الاستعادة.")} />}</div>;
}

function RiskMatrix({ locale, complete, onComplete }: { locale: Locale; complete: boolean; onComplete: () => void }) {
  const [impact, setImpact] = useState("3");
  const [likelihood, setLikelihood] = useState("2");
  const [recorded, setRecorded] = useState(false);
  const score = Number(impact) * Number(likelihood);
  const level = score >= 6 ? text(locale, "High priority", "أولوية عالية") : score >= 3 ? text(locale, "Medium priority", "أولوية متوسطة") : text(locale, "Lower priority", "أولوية أقل");
  const label = (value: string) => text(locale, value === "3" ? "High (3)" : value === "2" ? "Medium (2)" : "Low (1)", value === "3" ? "عالٍ (٣)" : value === "2" ? "متوسط (٢)" : "منخفض (١)");
  return <div className="risk-activity"><div className="risk-controls"><label>{text(locale, "Impact", "الأثر")}<select value={impact} onChange={(event) => { setImpact(event.target.value); setRecorded(false); }}><option value="1">{label("1")}</option><option value="2">{label("2")}</option><option value="3">{label("3")}</option></select></label><span aria-hidden="true">×</span><label>{text(locale, "Likelihood", "الاحتمال")}<select value={likelihood} onChange={(event) => { setLikelihood(event.target.value); setRecorded(false); }}><option value="1">{label("1")}</option><option value="2">{label("2")}</option><option value="3">{label("3")}</option></select></label><strong>{score}</strong></div><div className="risk-grid" role="img" aria-label={text(locale, `Risk score ${score}: ${level}`, `درجة الخطر ${score}: ${level}`)}>{[3, 2, 1].map((impactValue) => [1, 2, 3].map((likelihoodValue) => { const value = impactValue * likelihoodValue; return <span key={`${impactValue}-${likelihoodValue}`} data-selected={impactValue === Number(impact) && likelihoodValue === Number(likelihood)} data-level={value >= 6 ? "high" : value >= 3 ? "medium" : "low"}>{value}</span>; }))}</div><p className="risk-priority"><strong>{level}</strong> · {text(locale, "Use the score with evidence and human judgment.", "استخدم الدرجة مع الدليل والحكم البشري.")}</p><button className="button secondary" type="button" onClick={() => { setRecorded(true); onComplete(); }}>{text(locale, "Record priority", "سجل الأولوية")}</button>{recorded && <Status locale={locale} success message={text(locale, `Recorded: ${score} is ${level.toLowerCase()}.`, `تم التسجيل: ${score} هي ${level}.`)} />}</div>;
}

export function Unit2ActivityRenderer({ activity, locale, complete, onComplete }: { activity: LessonActivity; locale: Locale; complete: boolean; onComplete: (id: string) => void }) {
  const render = activity.id === "https-handshake" ? <HttpsHandshake locale={locale} complete={complete} onComplete={() => onComplete(activity.id)} />
    : activity.id === "security-technology-map" ? <SecurityTechnologyMap locale={locale} complete={complete} onComplete={() => onComplete(activity.id)} />
      : activity.id === "firewall-filter" ? <FirewallFilter locale={locale} complete={complete} onComplete={() => onComplete(activity.id)} />
        : activity.id === "defense-layers" ? <DefenseLayers locale={locale} complete={complete} onComplete={() => onComplete(activity.id)} />
          : activity.id === "incident-order" ? <IncidentOrder locale={locale} complete={complete} onComplete={() => onComplete(activity.id)} />
            : <RiskMatrix locale={locale} complete={complete} onComplete={() => onComplete(activity.id)} />;
  return <ActivityFrame activity={activity} locale={locale} complete={complete}>{render}</ActivityFrame>;
}

function ChallengeSchoolPortal({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const [choice, setChoice] = useState(""); const [reason, setReason] = useState(""); const [saved, setSaved] = useState(false);
  const success = choice === "mfa" && reason.trim().length >= 12;
  const save = () => { setSaved(true); if (success) onComplete(); };
  return <><fieldset className="challenge-options"><legend>{text(locale, "Choose the sign-in design", "اختر تصميم تسجيل الدخول")}</legend><label><input type="radio" checked={choice === "password"} onChange={() => setChoice("password")} />{text(locale, "Password only", "كلمة مرور فقط")}</label><label><input type="radio" checked={choice === "mfa"} onChange={() => setChoice("mfa")} />{text(locale, "Password + a one-time code or approved device", "كلمة مرور + رمز لمرة واحدة أو جهاز معتمد")}</label></fieldset><label className="challenge-writing"><span>{text(locale, "Your evidence-based conclusion", "خلاصتك القائمة على الدليل")}</span><textarea value={reason} onChange={(event) => { setReason(event.target.value); setSaved(false); }} placeholder={text(locale, "Mention security, access, and one limitation.", "اذكر الأمان والوصول وحداً واحداً.")} /></label><button className="button secondary" type="button" onClick={save}>{text(locale, "Save conclusion", "احفظ الخلاصة")}</button>{saved && <Status locale={locale} success={success} message={success ? text(locale, "Recorded. MFA combines a secret with a different proof; your explanation considers real access needs.", "تم التسجيل. تجمع MFA سراً مع إثبات مختلف؛ ويراعي تفسيرك احتياجات الوصول الحقيقية.") : text(locale, "Choose the multi-factor option and add a short reason before recording your conclusion.", "اختر خيار العوامل المتعددة وأضف سبباً قصيراً قبل تسجيل الخلاصة.")} />}</>;
}

function ChallengeCompany({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const options = [L("Firewall rules for network traffic", "قواعد جدار حماية لحركة الشبكة"), L("VPN for verified remote staff", "VPN للموظفين عن بعد بعد التحقق"), L("DMZ for the public website", "DMZ للموقع العام"), L("Updated, protected endpoint devices", "أجهزة نقاط نهاية محمية ومحدثة"), L("Identity and permission checks for important requests", "فحوص الهوية والصلاحية للطلبات المهمة")];
  const [selected, setSelected] = useState<number[]>([]); const [reason, setReason] = useState(""); const [saved, setSaved] = useState(false);
  const success = selected.length === options.length && reason.trim().length >= 12;
  return <><fieldset className="challenge-options"><legend>{text(locale, "Select every layer your design needs", "حدد كل الطبقات التي يحتاجها تصميمك")}</legend>{options.map((option, index) => <label key={option.en}><input type="checkbox" checked={selected.includes(index)} onChange={() => { setSelected((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index]); setSaved(false); }} />{pick(locale, option)}</label>)}</fieldset><label className="challenge-writing"><span>{text(locale, "How do the layers work together, and what risk remains?", "كيف تعمل الطبقات معاً، وما الخطر المتبقي؟")}</span><textarea value={reason} onChange={(event) => { setReason(event.target.value); setSaved(false); }} /></label><button className="button secondary" type="button" onClick={() => { setSaved(true); if (success) onComplete(); }}>{text(locale, "Save network design", "احفظ تصميم الشبكة")}</button>{saved && <Status locale={locale} success={success} message={success ? text(locale, "Recorded. You used a defense-in-depth design and identified its trade-off.", "تم التسجيل. استخدمت تصميماً دفاعياً متعمقاً وحددت مقايضته.") : text(locale, "This scenario needs every listed layer plus a brief explanation of how the layers cooperate.", "يحتاج هذا السيناريو إلى كل الطبقات المدرجة مع شرح موجز لكيفية تعاونها.")} />}</>;
}

function ChallengeRansomware({ locale, onComplete }: { locale: Locale; onComplete: () => void }) {
  const [action, setAction] = useState(""); const [reason, setReason] = useState(""); const [saved, setSaved] = useState(false);
  const success = action === "contain" && reason.trim().length >= 12;
  return <><fieldset className="challenge-options"><legend>{text(locale, "What is the next action after detection?", "ما الإجراء التالي بعد الاكتشاف؟")}</legend><label><input type="radio" checked={action === "recover"} onChange={() => setAction("recover")} />{text(locale, "Restore every file immediately", "استعد كل الملفات فوراً")}</label><label><input type="radio" checked={action === "contain"} onChange={() => setAction("contain")} />{text(locale, "Isolate affected systems to contain the spread", "اعزل الأنظمة المتأثرة لاحتواء الانتشار")}</label><label><input type="radio" checked={action === "ignore"} onChange={() => setAction("ignore")} />{text(locale, "Wait and see whether it stops", "انتظر لترى إن كان سيتوقف")}</label></fieldset><label className="challenge-writing"><span>{text(locale, "Use impact × likelihood to compare another ransomware attack with a brief power cut. What should be prioritised, and why?", "استخدم الأثر × الاحتمال لمقارنة هجوم فدية آخر بانقطاع كهرباء قصير. ما الذي ينبغي إعطاؤه الأولوية ولماذا؟")}</span><textarea value={reason} onChange={(event) => { setReason(event.target.value); setSaved(false); }} /></label><button className="button secondary" type="button" onClick={() => { setSaved(true); if (success) onComplete(); }}>{text(locale, "Save response plan", "احفظ خطة الاستجابة")}</button>{saved && <Status locale={locale} success={success} message={success ? text(locale, "Recorded. Containment limits harm; the explanation then supports a priority with impact and likelihood.", "تم التسجيل. يحد الاحتواء من الضرر؛ ويدعم التفسير بعد ذلك أولوية بالأثر والاحتمال.") : text(locale, "Start with containment and add a short, evidence-based risk comparison.", "ابدأ بالاحتواء وأضف مقارنة مخاطر قصيرة قائمة على الدليل.")} />}</>;
}

export function Unit2Challenge({ challenge, reflection, locale, complete, onComplete, reflectionValue, onReflectionChange }: { challenge: LessonChallenge; reflection?: CurriculumLessonReflection; locale: Locale; complete: boolean; onComplete: () => void; reflectionValue: string; onReflectionChange: (value: string) => void }) {
  const content = challenge.id === "school-portal-mfa" ? <ChallengeSchoolPortal locale={locale} onComplete={onComplete} /> : challenge.id === "company-defense-design" ? <ChallengeCompany locale={locale} onComplete={onComplete} /> : <ChallengeRansomware locale={locale} onComplete={onComplete} />;
  return <><article className="panel unit2-challenge" data-complete={complete}><div className="unit2-challenge-heading"><span><ShieldCheck size={23} /></span><div><span className="eyebrow">{text(locale, "Think as an Engineer", "فكر كمهندس")}</span><h2>{pick(locale, challenge.title)}</h2><p>{pick(locale, challenge.prompt)}</p></div></div><ul>{challenge.successCriteria.map((criterion) => <li key={criterion.en}><CheckCircle2 size={16} />{pick(locale, criterion)}</li>)}</ul>{content}</article>{reflection && <article className="panel unit2-reflection"><span className="eyebrow">{text(locale, "Transfer & reflect", "نقل وتأمل")}</span><h3>{text(locale, "Apply the idea in a new context", "طبق الفكرة في سياق جديد")}</h3><p>{pick(locale, reflection.transfer)}</p><p className="pair-prompt"><strong>{text(locale, "In-person pair discussion:", "نقاش ثنائي حضوري:")}</strong> {pick(locale, reflection.pairDiscussion)}</p><label><span>{pick(locale, reflection.individualPrompt)}</span><textarea value={reflectionValue} onChange={(event) => onReflectionChange(event.target.value)} placeholder={text(locale, "Write your individual conclusion.", "اكتب خلاصتك الفردية.")} /></label></article>}</>;
}

type CurriculumLessonReflection = { transfer: LocalizedText; pairDiscussion: LocalizedText; individualPrompt: LocalizedText };

function L(en: string, ar: string): LocalizedText { return { en, ar }; }

function reviewCorrect(question: UnitReviewQuestion, values: Record<string, string>, orders: Record<string, string[]>) {
  if (question.kind === "choice") return values[question.id] === question.answer;
  if (question.kind === "matching") return question.pairs?.every((pair) => values[`${question.id}:${pair.id}`] === pair.id) ?? false;
  return question.order?.every((item, index) => orders[question.id]?.[index] === item.id) ?? false;
}

function ReviewItem({ question, locale, value, orders, onValue, onOrder, submitted, locked }: { question: UnitReviewQuestion; locale: Locale; value: Record<string, string>; orders: Record<string, string[]>; onValue: (key: string, answer: string) => void; onOrder: (key: string, order: string[]) => void; submitted: boolean; locked: boolean }) {
  const correct = reviewCorrect(question, value, orders);
  if (question.kind === "choice") return <article className={`panel final-review-item ${submitted ? correct ? "is-correct" : "is-incorrect" : ""}`}><span>{question.id.replace("review-", "")}</span><h3>{pick(locale, question.prompt)}</h3><div className="question-options" role="radiogroup" aria-label={pick(locale, question.prompt)}>{question.choices?.map((option) => <label className="choice-row" key={option.id}><input type="radio" disabled={locked} name={question.id} checked={value[question.id] === option.id} onChange={() => onValue(question.id, option.id)} />{pick(locale, option.text)}</label>)}</div>{submitted && <div className="answer-feedback"><strong>{correct ? text(locale, "Correct", "إجابة صحيحة") : text(locale, "Review this", "راجع هذه النقطة")}</strong><p>{pick(locale, question.explanation)}</p></div>}</article>;
  if (question.kind === "matching") return <article className={`panel final-review-item ${submitted ? correct ? "is-correct" : "is-incorrect" : ""}`}><span>{question.id.replace("review-", "")}</span><h3>{pick(locale, question.prompt)}</h3><div className="final-match-grid">{question.pairs?.map((pair) => <label key={pair.id}><span>{pick(locale, pair.left)}</span><select disabled={locked} value={value[`${question.id}:${pair.id}`] ?? ""} onChange={(event) => onValue(`${question.id}:${pair.id}`, event.target.value)}><option value="">{text(locale, "Choose", "اختر")}</option>{question.pairs?.map((option) => <option key={option.id} value={option.id}>{pick(locale, option.right)}</option>)}</select></label>)}</div>{submitted && <div className="answer-feedback"><strong>{correct ? text(locale, "Correct", "إجابة صحيحة") : text(locale, "Review this", "راجع هذه النقطة")}</strong><p>{pick(locale, question.explanation)}</p></div>}</article>;
  const order = orders[question.id] ?? question.order?.map((item) => item.id).toReversed() ?? [];
  const lookup = new Map(question.order?.map((item) => [item.id, item]));
  const move = (index: number, direction: -1 | 1) => { const next = [...order]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onOrder(question.id, next); };
  return <article className={`panel final-review-item ${submitted ? correct ? "is-correct" : "is-incorrect" : ""}`}><span>{question.id.replace("review-", "")}</span><h3>{pick(locale, question.prompt)}</h3><ol className="final-ordering">{order.map((id, index) => <li key={id}><b>{index + 1}</b><span>{pick(locale, lookup.get(id)?.text ?? L("", ""))}</span><div><button type="button" disabled={locked || index === 0} onClick={() => move(index, -1)} aria-label={text(locale, "Move earlier", "انقل لأعلى")}><ArrowUp size={15} /></button><button type="button" disabled={locked || index === order.length - 1} onClick={() => move(index, 1)} aria-label={text(locale, "Move later", "انقل لأسفل")}><ArrowDown size={15} /></button></div></li>)}</ol>{submitted && <div className="answer-feedback"><strong>{correct ? text(locale, "Correct", "إجابة صحيحة") : text(locale, "Review this", "راجع هذه النقطة")}</strong><p>{pick(locale, question.explanation)}</p></div>}</article>;
}

export function Unit2FinalReview({ review, locale, submitted, storedScore, initialAnswers, initialOrders, onSubmit }: { review: UnitReview; locale: Locale; submitted: boolean; storedScore?: number; initialAnswers: Record<string, string>; initialOrders: Record<string, string[]>; onSubmit: (result: { score: number; total: number; mistakes: SavedUnit2Mistake[]; answers: Record<string, string>; orders: Record<string, string[]> }) => void }) {
  const [values, setValues] = useState<Record<string, string>>(initialAnswers);
  const [orders, setOrders] = useState<Record<string, string[]>>(initialOrders);
  const [localSubmitted, setLocalSubmitted] = useState(submitted);
  const isSubmitted = submitted || localSubmitted;
  const result = useMemo(() => ({ score: review.questions.filter((question) => reviewCorrect(question, values, orders)).length, total: review.questions.length }), [orders, review.questions, values]);
  const submit = () => {
    const mistakes = review.questions.filter((question) => !reviewCorrect(question, values, orders)).map((question) => ({ id: `final-review:${question.id}`, questionId: question.id, question: question.prompt, learnerAnswer: question.kind === "ordering" ? (orders[question.id] ?? []).join(" > ") : question.kind === "matching" ? (question.pairs ?? []).map((pair) => values[`${question.id}:${pair.id}`] ?? "").join(" | ") : values[question.id] ?? "", correctAnswer: question.kind === "ordering" ? question.order?.map((item) => item.id).join(" > ") ?? "" : question.kind === "matching" ? question.pairs?.map((pair) => pair.id).join(" | ") ?? "" : question.answer ?? "", explanation: question.explanation, source: "unit-review" as const }));
    setLocalSubmitted(true); onSubmit({ ...result, mistakes, answers: values, orders });
  };
  const displayedScore = submitted && typeof storedScore === "number" ? storedScore : result.score;
  const revealAnswers = isSubmitted;
  return <section className="unit2-final-review"><header><span className="eyebrow">{text(locale, "Final review", "المراجعة الختامية")}</span><h2>{pick(locale, review.title)}</h2><p>{pick(locale, review.introduction)}</p></header><div className="final-review-stack">{review.questions.map((question) => <ReviewItem key={question.id} question={question} locale={locale} value={values} orders={orders} submitted={revealAnswers} locked={isSubmitted} onValue={(key, answer) => setValues((current) => ({ ...current, [key]: answer }))} onOrder={(key, order) => setOrders((current) => ({ ...current, [key]: order }))} />)}</div>{isSubmitted ? <article className="panel final-review-result"><CheckCircle2 size={27} /><div><strong>{displayedScore}/{result.total}</strong><p>{text(locale, "Your final unit review is saved. Use the feedback above to revisit missed ideas.", "حُفظت مراجعة الوحدة الختامية. استخدم التعليق أعلاه لمراجعة الأفكار التي فاتتك.")}</p></div></article> : <button className="button" type="button" onClick={submit}>{text(locale, "Submit final review", "أرسل المراجعة الختامية")}</button>}</section>;
}
