"use client";

import { ArrowRight, BookOpen, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemePreferenceControl } from "@/components/theme-preference";
import type { AppLocale } from "@/lib/i18n";

const copy = {
  en: { eyebrow: "Teacher invitation", title: "Set your teaching password", body: "Choose a password to activate your invited teaching account.", password: "New password", confirm: "Confirm password", help: "Use at least 12 characters with upper- and lowercase letters and a number.", submit: "Activate teaching account", invalid: "This invitation is invalid or has expired. Ask your administrator for a new invitation.", privacy: "Your teaching account is protected and separate from student access.", show: "Show password", hide: "Hide password" },
  ar: { eyebrow: "دعوة معلّم", title: "عيّن كلمة مرور التدريس", body: "اختر كلمة مرور لتفعيل حساب التدريس المدعو إليه.", password: "كلمة المرور الجديدة", confirm: "تأكيد كلمة المرور", help: "استخدم 12 حرفًا على الأقل، مع حرف كبير وصغير ورقم.", submit: "تفعيل حساب التدريس", invalid: "هذه الدعوة غير صالحة أو انتهت. اطلب من المسؤول إرسال دعوة جديدة.", privacy: "حساب التدريس محمي ومنفصل عن وصول الطلاب.", show: "إظهار كلمة المرور", hide: "إخفاء كلمة المرور" },
} as const;

export function TeacherInvitationForm({ locale, token }: { locale: AppLocale; token?: string }) {
  const t = copy[locale];
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const invalidPassword = Boolean(password) && (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || password.length < 12);
  const invalidConfirmation = Boolean(confirmation) && password !== confirmation;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidPassword || invalidConfirmation) { setError(t.invalid); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/v1/auth/complete-teacher-invitation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, confirmation, ...(token ? { token } : {}) }) });
      if (!response.ok) throw new Error();
      router.replace(`/${locale}/teacher`);
      router.refresh();
    } catch { setError(t.invalid); } finally { setPending(false); }
  }

  return <main id="main-content" className="auth-page admin-bootstrap-page">
    <div className="auth-theme-toggle"><ThemePreferenceControl locale={locale} compact /></div>
    <div className="auth-orbit auth-orbit-one" aria-hidden="true" /><div className="auth-orbit auth-orbit-two" aria-hidden="true" />
    <section className="auth-card" aria-labelledby="teacher-invitation-title">
      <div className="auth-brand"><span className="auth-brand-mark"><BookOpen size={24} /></span><span><strong>Quantro AI</strong><small>{locale === "ar" ? "تعلّم. افهم. أنجز." : "Learn. Understand. Achieve."}</small></span></div>
      <div className="auth-card-copy"><span className="auth-role-badge"><ShieldCheck size={16} />{t.eyebrow}</span><h1 id="teacher-invitation-title">{t.title}</h1><p>{t.body}</p></div>
      <form onSubmit={submit} noValidate>
        <label className="field"><span>{t.password}</span><div className="password-field"><input className="text-input" type={visible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" aria-invalid={invalidPassword} required /><button className="icon-button" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? t.hide : t.show}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>{t.help}</small></label>
        <label className="field"><span>{t.confirm}</span><div className="password-field"><input className="text-input" type={visible ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" aria-invalid={invalidConfirmation} required /></div></label>
        {error && <p className="feedback error auth-error" role="alert">{error}</p>}
        <button className="button auth-submit" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <ArrowRight className="flip-rtl" />}{t.submit}</button>
      </form>
      <p className="auth-privacy"><LockKeyhole size={14} />{t.privacy}</p>
    </section>
  </main>;
}
