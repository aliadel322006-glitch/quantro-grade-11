"use client";

import { ArrowRight, BookOpen, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemePreferenceControl } from "@/components/theme-preference";
import type { AppLocale } from "@/lib/i18n";

const copy = {
  en: { eyebrow: "One-time platform setup", title: "Create the first administrator", body: "This page is available only until the first administrator account is created.", name: "Display name", email: "Email address", password: "Password", confirm: "Confirm password", passwordHelp: "Use at least 12 characters with upper- and lowercase letters and a number.", submit: "Create administrator", invalid: "Check each field and try again. The setup may no longer be available.", privacy: "This creates a protected staff account. Student registration cannot create an administrator.", login: "Administrator login" },
  ar: { eyebrow: "إعداد المنصة لمرة واحدة", title: "إنشاء حساب المسؤول الأول", body: "تتوفر هذه الصفحة فقط حتى إنشاء أول حساب مسؤول.", name: "الاسم الظاهر", email: "البريد الإلكتروني", password: "كلمة المرور", confirm: "تأكيد كلمة المرور", passwordHelp: "استخدم 12 حرفًا على الأقل، مع حرف كبير وصغير ورقم.", submit: "إنشاء حساب المسؤول", invalid: "راجع الحقول وحاول مرة أخرى. ربما لم يعد الإعداد متاحًا.", privacy: "ينشئ هذا حساب موظف محميًا. لا يمكن لتسجيل الطالب إنشاء مسؤول.", login: "دخول المسؤول" },
} as const;

export function AdminBootstrapForm({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const passwordInvalid = Boolean(password) && (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || password.length < 12);
  const confirmationInvalid = Boolean(confirmation) && password !== confirmation;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordInvalid || confirmationInvalid) { setError(t.invalid); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/v1/auth/bootstrap-admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName, email, password, confirmation, locale }) });
      if (!response.ok) throw new Error();
      router.replace(`/${locale}/auth/admin/login`);
      router.refresh();
    } catch { setError(t.invalid); } finally { setPending(false); }
  }

  return <main id="main-content" className="auth-page admin-bootstrap-page">
    <div className="auth-theme-toggle"><ThemePreferenceControl locale={locale} compact /></div>
    <div className="auth-orbit auth-orbit-one" aria-hidden="true" /><div className="auth-orbit auth-orbit-two" aria-hidden="true" />
    <section className="auth-card" aria-labelledby="admin-bootstrap-title">
      <div className="auth-brand"><span className="auth-brand-mark"><BookOpen size={24} /></span><span><strong>Quantro AI</strong><small>{locale === "ar" ? "تعلّم. افهم. أنجز." : "Learn. Understand. Achieve."}</small></span></div>
      <div className="auth-card-copy"><span className="auth-role-badge"><ShieldCheck size={16} />{t.eyebrow}</span><h1 id="admin-bootstrap-title">{t.title}</h1><p>{t.body}</p></div>
      <form onSubmit={submit} noValidate>
        <label className="field"><span>{t.name}</span><div className="input-with-icon"><UserRound size={18} /><input className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required /></div></label>
        <label className="field"><span>{t.email}</span><div className="input-with-icon"><Mail size={18} /><input className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div></label>
        <label className="field"><span>{t.password}</span><div className="password-field"><input className="text-input" type={visible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" aria-invalid={passwordInvalid} required /><button className="icon-button" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>{t.passwordHelp}</small></label>
        <label className="field"><span>{t.confirm}</span><div className="password-field"><input className="text-input" type={visible ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" aria-invalid={confirmationInvalid} required /></div></label>
        {error && <p className="feedback error auth-error" role="alert">{error}</p>}
        <button className="button auth-submit" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <ArrowRight className="flip-rtl" />}{t.submit}</button>
      </form>
      <p className="auth-switch"><Link href={`/${locale}/auth/admin/login`}>{t.login}</Link></p>
      <p className="auth-privacy"><LockKeyhole size={14} />{t.privacy}</p>
    </section>
  </main>;
}
