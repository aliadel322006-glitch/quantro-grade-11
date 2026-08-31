"use client";

import { BrainCircuit, CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { LessonChallenge, LessonReflection } from "@/content/part1-curriculum";
import type { Locale, LocalizedText } from "@/lib/types";

const text = (locale: Locale, en: string, ar: string) => locale === "ar" ? ar : en;
const pick = (locale: Locale, value: LocalizedText) => value[locale];
const L = (en: string, ar: string): LocalizedText => ({ en, ar });

type Unit1ChallengeProps = {
  challenge: LessonChallenge;
  reflection?: LessonReflection;
  locale: Locale;
  complete: boolean;
  onComplete: () => void;
  reflectionValue: string;
  onReflectionChange: (value: string) => void;
};

type Unit1ChallengeId = "school-ai-service" | "community-center-transform" | "revision-recommendations" | "city-ai-service" | "school-program-ethics";
type FieldId = "problem" | "analysis" | "risk" | "design";
type ChallengeField = { id: FieldId; label: LocalizedText; accepted: string[]; options: Array<{ id: string; text: LocalizedText }> };
type ChallengeDefinition = { pipeline: LocalizedText[]; fields: ChallengeField[]; recorded: LocalizedText; incomplete: LocalizedText };
const option = (id: string, en: string, ar: string) => ({ id, text: L(en, ar) });
const field = (id: FieldId, en: string, ar: string, accepted: string[], options: ChallengeField["options"]): ChallengeField => ({ id, label: L(en, ar), accepted, options });

const stages = [L("Scenario", "السيناريو"), L("Understand", "افهم"), L("Choose / analyse", "اختر / حلل"), L("Risks", "المخاطر"), L("Design", "صمم"), L("Justify", "برر")];

const definitions: Record<Unit1ChallengeId, ChallengeDefinition> = {
  "community-center-transform": {
    pipeline: [L("Community need", "حاجة مجتمعية"), L("Useful technology", "تقنية مفيدة"), L("Access support", "دعم الوصول"), L("Measure success", "قياس النجاح")],
    fields: [
      field("problem", "1. What should the centre improve first?", "١. ما الذي ينبغي أن يحسنه المركز أولًا؟", ["event-info"], [option("event-info", "Clear event information and registration", "معلومات فعاليات وتسجيل واضحان"), option("replace-staff", "Remove in-person questions completely", "إلغاء الأسئلة الحضورية تمامًا"), option("new-devices", "Buy devices before understanding the need", "شراء أجهزة قبل فهم الحاجة")]),
      field("analysis", "2. Choose an appropriate first technology", "٢. اختر تقنية أولى مناسبة", ["accessible-page"], [option("accessible-page", "An accessible information page with simple registration", "صفحة معلومات متاحة مع تسجيل بسيط"), option("paper-only", "Keep every process on paper only", "إبقاء كل عملية ورقية فقط"), option("app-only", "An app that requires every resident to own a new phone", "تطبيق يتطلب من كل ساكن امتلاك هاتف جديد")]),
      field("risk", "3. Identify the access constraint", "٣. حدد قيد الوصول", ["digital-gap"], [option("digital-gap", "Some residents may lack devices, connectivity, or confidence", "قد يفتقر بعض السكان للأجهزة أو الاتصال أو الثقة"), option("no-gap", "Digital services work equally for everyone automatically", "الخدمات الرقمية تعمل تلقائيًا بالتساوي للجميع"), option("ignore", "Access differences do not affect service design", "اختلافات الوصول لا تؤثر في تصميم الخدمة")]),
      field("design", "4. Keep an inclusive support route", "٤. أبقِ مسار دعم شامل", ["paper-help"], [option("paper-help", "Keep phone, in-person, and paper help available", "أبقِ المساعدة الهاتفية والحضورية والورقية متاحة"), option("online-only", "Make online registration the only route", "اجعل التسجيل عبر الإنترنت المسار الوحيد"), option("fees", "Charge residents who need extra support", "اطلب رسومًا من السكان الذين يحتاجون دعمًا إضافيًا")]),
    ],
    recorded: L("Recorded. Your proposal connects a service need with an accessible technology choice and support for every resident.", "تم التسجيل. يربط مقترحك بين حاجة خدمية واختيار تقني متاح ودعم لكل السكان."),
    incomplete: L("Complete the four decisions with an inclusive first step, then add a 30-character conclusion.", "أكمل القرارات الأربعة بخطوة أولى شاملة، ثم أضف خلاصة من 30 حرفًا."),
  },
  "revision-recommendations": {
    pipeline: [L("Learning data", "بيانات التعلم"), L("AI finds patterns", "يعثر الذكاء الاصطناعي على أنماط"), L("Recommendation", "توصية"), L("Learner / teacher checks", "فحص المتعلم / المعلم")],
    fields: [
      field("problem", "1. What should the system help with?", "١. في ماذا ينبغي أن يساعد النظام؟", ["revision-topics"], [option("revision-topics", "Suggest revision topics to explore", "اقتراح موضوعات مراجعة لاستكشافها"), option("final-grades", "Set each learner’s final grade", "تحديد الدرجة النهائية لكل متعلم"), option("secret-rank", "Create hidden rankings with no explanation", "إنشاء ترتيبات مخفية بلا شرح")]),
      field("analysis", "2. Which evidence can reveal a learning pattern?", "٢. أي دليل يمكن أن يكشف نمط تعلم؟", ["learning-pattern"], [option("learning-pattern", "Completed tasks and topics the learner has practised", "المهام المكتملة والموضوعات التي تدرب عليها المتعلم"), option("private-messages", "Every private message and contact", "كل رسالة خاصة وكل جهة اتصال"), option("guess", "A random guess with no learning evidence", "تخمين عشوائي بلا دليل تعلم")]),
      field("risk", "3. What can make a recommendation misleading?", "٣. ما الذي قد يجعل التوصية مضللة؟", ["missing-data"], [option("missing-data", "Incomplete or outdated learning evidence", "دليل تعلم ناقص أو قديم"), option("certainty", "A model is always certain once it has data", "النموذج دائمًا متيقن بعد حصوله على بيانات"), option("speed", "A quick answer cannot have limits", "الإجابة السريعة لا يمكن أن تكون لها حدود")]),
      field("design", "4. Who should remain able to check the result?", "٤. من ينبغي أن يظل قادرًا على فحص النتيجة؟", ["teacher-learner"], [option("teacher-learner", "The learner and teacher, with a clear AI notice", "المتعلم والمعلم مع إشعار واضح بأن التوصية من الذكاء الاصطناعي"), option("model-alone", "The model alone, without questions", "النموذج وحده بلا أسئلة"), option("hidden", "Nobody, because the recommendation is hidden", "لا أحد لأن التوصية مخفية")]),
    ],
    recorded: L("Recorded. You described pattern-based support, its data limits, and a human check rather than treating AI as magic.", "تم التسجيل. وصفت دعمًا قائمًا على الأنماط وحدود بياناته وفحصًا بشريًا بدل التعامل مع الذكاء الاصطناعي كسحر."),
    incomplete: L("Choose the responsible data, risk, and human-check decisions, then add a 30-character conclusion.", "اختر قرارات البيانات والمخاطر والفحص البشري المسؤولة، ثم أضف خلاصة من 30 حرفًا."),
  },
  "city-ai-service": {
    pipeline: [L("Public service", "خدمة عامة"), L("Relevant inputs", "مدخلات ذات صلة"), L("AI-assisted suggestion", "اقتراح مدعوم بالذكاء الاصطناعي"), L("Human oversight", "رقابة بشرية")],
    fields: [
      field("problem", "1. Choose one service to improve", "١. اختر خدمة واحدة لتحسينها", ["transport", "waste", "appointments", "agriculture", "support", "traffic"], [option("transport", "Public transport", "النقل العام"), option("waste", "Waste collection", "جمع النفايات"), option("appointments", "Healthcare appointments", "مواعيد الرعاية الصحية"), option("agriculture", "Agriculture support", "دعم الزراعة"), option("support", "Customer support", "دعم العملاء"), option("traffic", "Traffic management", "إدارة المرور")]),
      field("analysis", "2. What kind of input is useful?", "٢. ما نوع بيانات الإدخال المفيد؟", ["service-data"], [option("service-data", "Relevant service demand, timing, or route data", "بيانات الطلب أو التوقيت أو المسار ذات الصلة بالخدمة"), option("everything", "Every private detail about every resident", "كل التفاصيل الخاصة عن كل ساكن"), option("none", "No information at all", "لا معلومات على الإطلاق")]),
      field("risk", "3. Which limit should be planned for?", "٣. ما القيد الذي ينبغي التخطيط له؟", ["service-risk"], [option("service-risk", "Biased, missing, or unusual data can produce a poor suggestion", "البيانات المتحيزة أو الناقصة أو غير المعتادة قد تنتج اقتراحًا سيئًا"), option("perfect", "Automation makes every result fair and correct", "الأتمتة تجعل كل نتيجة عادلة وصحيحة"), option("ignore-users", "User impact does not matter for public services", "أثر الخدمة في المستخدمين لا يهم للخدمات العامة")]),
      field("design", "4. What should a person check?", "٤. ما الذي ينبغي أن يفحصه شخص؟", ["important-outcomes"], [option("important-outcomes", "Important outcomes, exceptions, and complaints", "النتائج المهمة والاستثناءات والشكاوى"), option("nothing", "Nothing after the system starts", "لا شيء بعد بدء النظام"), option("only-speed", "Only whether the system is fast", "فقط ما إذا كان النظام سريعًا")]),
    ],
    recorded: L("Recorded. Your service proposal balances a useful capability with realistic limits and human oversight.", "تم التسجيل. يوازن مقترح خدمتك بين قدرة مفيدة وحدود واقعية ورقابة بشرية."),
    incomplete: L("Choose a public service and complete the data, risk, and human-check decisions before recording your conclusion.", "اختر خدمة عامة وأكمل قرارات البيانات والمخاطر والفحص البشري قبل تسجيل خلاصتك."),
  },
  "school-program-ethics": {
    pipeline: [L("Selection support", "دعم الاختيار"), L("Check data quality", "فحص جودة البيانات"), L("Explainable review", "مراجعة قابلة للتفسير"), L("Accountable decision", "قرار خاضع للمساءلة")],
    fields: [
      field("problem", "1. What role may AI have in selection?", "١. ما الدور الذي قد يؤديه الذكاء الاصطناعي في الاختيار؟", ["assist-review"], [option("assist-review", "Support a teacher panel with evidence to review", "دعم لجنة من المعلمين بأدلة للمراجعة"), option("final-alone", "Make the final selection alone", "اتخاذ الاختيار النهائي وحده"), option("secret-score", "Produce a hidden score no one can question", "إنتاج درجة مخفية لا يستطيع أحد الاعتراض عليها")]),
      field("analysis", "2. What should the school investigate in past data?", "٢. ما الذي ينبغي أن تفحصه المدرسة في البيانات السابقة؟", ["representation"], [option("representation", "Whether past records contain unfair patterns or gaps", "ما إذا كانت السجلات السابقة تحوي أنماطًا غير عادلة أو فجوات"), option("ignore-history", "Whether the model can copy every historical choice", "ما إذا كان النموذج يستطيع نسخ كل اختيار تاريخي"), option("popularity", "Which applicants are most popular online", "أي المتقدمين أكثر شعبية عبر الإنترنت")]),
      field("risk", "3. What data choice is most responsible?", "٣. ما اختيار البيانات الأكثر مسؤولية؟", ["necessary-data"], [option("necessary-data", "Use only relevant, protected evidence and exclude unnecessary private data", "استخدم دليلًا ذا صلة ومحميًا فقط واستبعد البيانات الخاصة غير اللازمة"), option("all-data", "Collect every message, location, and contact by default", "اجمع كل رسالة وموقع وجهة اتصال تلقائيًا"), option("publish", "Publish individual records to explain the result", "انشر السجلات الفردية لشرح النتيجة")]),
      field("design", "4. Which safeguard makes the decision accountable?", "٤. أي ضمان يجعل القرار خاضعًا للمساءلة؟", ["appeal-review"], [option("appeal-review", "Give reasons, allow an appeal, and monitor decisions with teachers", "قدم الأسباب وأتح الاعتراض وراقب القرارات مع المعلمين"), option("no-explanation", "Keep decisions secret to avoid questions", "أبقِ القرارات سرية لتجنب الأسئلة"), option("model-blame", "Say the model is responsible for unfair outcomes", "قل إن النموذج مسؤول عن النتائج غير العادلة")]),
    ],
    recorded: L("Recorded. Your design keeps people responsible while protecting fairness, privacy, and meaningful explanation.", "تم التسجيل. يبقي تصميمك الناس مسؤولين مع حماية الإنصاف والخصوصية والشرح المفيد."),
    incomplete: L("Complete the accountable selection, data, and safeguard decisions, then add a 30-character conclusion.", "أكمل قرارات الاختيار والبيانات والضمانات الخاضعة للمساءلة، ثم أضف خلاصة من 30 حرفًا."),
  },
  "school-ai-service": {
    pipeline: [L("Learning need", "حاجة تعلم"), L("Justified data", "بيانات مبررة"), L("Useful suggestion", "اقتراح مفيد"), L("Human check", "فحص بشري")],
    fields: [
      field("problem", "1. Define the learner need", "١. حدد حاجة المتعلم", ["revision"], [option("revision", "Find relevant revision materials", "العثور على مواد مراجعة مناسبة")]),
      field("analysis", "2. Choose justified evidence", "٢. اختر دليلًا مبررًا", ["learning"], [option("learning", "Topics chosen and tasks completed", "الموضوعات المختارة والمهام المكتملة")]),
      field("risk", "3. Name an important safeguard", "٣. سم ضمانًا مهمًا", ["minimise"], [option("minimise", "Use minimal data with clear notice", "استخدم أقل قدر من البيانات مع إشعار واضح")]),
      field("design", "4. Keep a human check", "٤. أبقِ فحصًا بشريًا", ["review"], [option("review", "Teacher review for important outcomes", "مراجعة المعلم للنتائج المهمة")]),
    ],
    recorded: L("Recorded. Your service connects a real need, limited data, safeguards, and human judgment.", "تم التسجيل. تربط خدمتك بين حاجة حقيقية وبيانات محدودة وضمانات وحكم بشري."),
    incomplete: L("Complete the four decisions and add a 30-character conclusion.", "أكمل القرارات الأربعة وأضف خلاصة من 30 حرفًا."),
  },
};

export function Unit1Challenge({ challenge, reflection, locale, complete, onComplete, reflectionValue, onReflectionChange }: Unit1ChallengeProps) {
  const definition = definitions[challenge.id as Unit1ChallengeId] ?? definitions["school-ai-service"];
  const [answers, setAnswers] = useState<Record<FieldId, string>>({ problem: "", analysis: "", risk: "", design: "" });
  const [submitted, setSubmitted] = useState(false);
  const success = useMemo(() => definition.fields.every((item) => item.accepted.includes(answers[item.id])) && reflectionValue.trim().length >= 30, [answers, definition.fields, reflectionValue]);
  const choose = (key: FieldId, value: string) => { setAnswers((current) => ({ ...current, [key]: value })); setSubmitted(false); };

  return <article className="panel unit1-challenge" data-complete={complete}>
    <header><span className="unit1-challenge-icon"><BrainCircuit size={21} /></span><div><span className="eyebrow">{text(locale, "Lesson design challenge", "تحدي تصميم الدرس")}</span><h3>{pick(locale, challenge.title)}</h3><p>{pick(locale, challenge.prompt)}</p></div>{complete && <span className="completion-badge"><CheckCircle2 size={16} />{text(locale, "Completed", "مكتمل")}</span>}</header>
    <ol className="unit1-challenge-stages" aria-label={text(locale, "Engineer challenge stages", "مراحل تحدي المهندس")}>{stages.map((stage, index) => <li key={stage.en}><span>{index + 1}</span><strong>{pick(locale, stage)}</strong></li>)}</ol>
    <section className="unit1-pipeline" aria-label={text(locale, "Challenge concept flow", "مسار مفهوم التحدي")}><Database aria-hidden="true" /><ol>{definition.pipeline.map((stage, index) => <li key={stage.en}><strong>{pick(locale, stage)}</strong>{index < definition.pipeline.length - 1 && <i aria-hidden="true" />}</li>)}</ol><ShieldCheck aria-hidden="true" /></section>
    <div className="unit1-decision-grid">{definition.fields.map((item) => <label key={item.id}><span>{pick(locale, item.label)}</span><select value={answers[item.id]} onChange={(event) => choose(item.id, event.target.value)}><option value="">{text(locale, "Choose an option", "اختر خيارًا")}</option>{item.options.map((choice) => <option key={choice.id} value={choice.id}>{pick(locale, choice.text)}</option>)}</select></label>)}</div>
    {reflection && <label className="challenge-writing"><span>{pick(locale, reflection.individualPrompt)}</span><textarea value={reflectionValue} onChange={(event) => { onReflectionChange(event.target.value); setSubmitted(false); }} placeholder={text(locale, "Write a short, evidence-based conclusion.", "اكتب خلاصة قصيرة مبنية على الدليل.")} /></label>}
    <div className="unit1-success-criteria"><strong>{text(locale, "Your design should include", "ينبغي أن يتضمن تصميمك")}</strong><ul>{challenge.successCriteria.map((criterion, index) => <li key={index}>{pick(locale, criterion)}</li>)}</ul></div>
    <button className="button secondary" type="button" onClick={() => { setSubmitted(true); if (success) onComplete(); }}>{text(locale, "Record my design", "سجل تصميمي")}</button>
    {submitted && <p className={`unit2-status ${success ? "success" : "warning"}`} role="status">{success ? <><CheckCircle2 size={17} />{pick(locale, definition.recorded)}</> : <><ShieldCheck size={17} />{pick(locale, definition.incomplete)}</>}</p>}
  </article>;
}
