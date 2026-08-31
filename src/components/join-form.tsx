"use client";

import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppLocale } from "@/lib/i18n";

const copy = {
  en: {
    eyebrow: "Pseudonymous class access",
    title: "Join your class",
    body: "Use the three codes your teacher gave you. The pilot does not need your name or email.",
    classCode: "Class code",
    learnerId: "Learner ID",
    pin: "8-digit PIN",
    submit: "Enter class",
    sample: "Try the safe demo",
    fill: "Fill demo credentials",
    error: "Those details do not match. Check all three codes or ask your teacher to reset the PIN.",
    privacy: "Never share your PIN. The platform never asks for a phone number, face, voice, or personal email.",
  },
  ar: {
    eyebrow: "دخول للفصل دون بيانات شخصية",
    title: "انضم إلى فصلك",
    body: "استخدم الرموز الثلاثة التي أعطاك إياها المعلّم. لا تحتاج النسخة التجريبية إلى اسمك أو بريدك.",
    classCode: "رمز الفصل",
    learnerId: "معرّف المتعلّم",
    pin: "رمز PIN من 8 أرقام",
    submit: "ادخل الفصل",
    sample: "جرّب العرض الآمن",
    fill: "املأ بيانات العرض",
    error: "البيانات غير متطابقة. راجع الرموز الثلاثة أو اطلب من المعلّم إعادة تعيين PIN.",
    privacy: "لا تشارك PIN. لن تطلب المنصة رقم هاتفك أو صورتك أو صوتك أو بريدك الشخصي.",
  },
} as const;

export function JoinForm({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  const router = useRouter();
  const [classCode, setClassCode] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [pin, setPin] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const fillDemo = () => {
    setClassCode("FUTURE11");
    setLearnerId("STUDENT1");
    setPin("26082026");
    setError("");
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/student-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classCode, learnerId, pin }),
      });
      if (!response.ok) throw new Error("invalid");
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError(t.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <main id="main-content" className="page shell">
      <section className="panel form-card">
        <span className="card-icon"><KeyRound aria-hidden="true" /></span>
        <span className="eyebrow" style={{ marginBlockStart: 18 }}>{t.eyebrow}</span>
        <h1>{t.title}</h1>
        <p>{t.body}</p>

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="class-code">{t.classCode}</label>
            <input id="class-code" className="text-input code-input" value={classCode} onChange={(event) => setClassCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} inputMode="text" autoComplete="off" minLength={8} maxLength={8} required aria-describedby={error ? "join-error" : undefined} />
          </div>
          <div className="field">
            <label htmlFor="learner-id">{t.learnerId}</label>
            <input id="learner-id" className="text-input code-input" value={learnerId} onChange={(event) => setLearnerId(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20))} autoComplete="username" required aria-describedby={error ? "join-error" : undefined} />
          </div>
          <div className="field">
            <label htmlFor="learner-pin">{t.pin}</label>
            <input id="learner-pin" className="text-input code-input" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="current-password" pattern="[0-9]{8}" minLength={8} maxLength={8} required aria-describedby={error ? "join-error" : "pin-privacy"} />
          </div>

          {error && <div id="join-error" className="feedback error" role="alert">{error}</div>}
          <button className="button" style={{ width: "100%", marginBlockStart: 18 }} disabled={pending} type="submit">
            {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowRight className="flip-rtl" aria-hidden="true" />}{t.submit}
          </button>
        </form>

        <div className="worked-box" style={{ marginBlockStart: 24 }}>
          <strong>{t.sample}</strong>
          <p style={{ margin: "5px 0 12px" }}><code>FUTURE11 · STUDENT1 · 26082026</code></p>
          <button className="button ghost small" type="button" onClick={fillDemo}>{t.fill}</button>
        </div>
        <p id="pin-privacy" style={{ display: "flex", gap: 8, fontSize: ".82rem" }}><ShieldCheck size={18} aria-hidden="true" />{t.privacy}</p>
      </section>
    </main>
  );
}
