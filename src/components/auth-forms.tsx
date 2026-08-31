"use client";

import { ArrowRight, BrainCircuit, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { ThemePreferenceControl } from "@/components/theme-preference";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppLocale } from "@/lib/i18n";

const copy = {
  en: {
    studentLogin: "Student login", teacherLogin: "Teacher login", create: "Create student account", welcomeBack: "Welcome back", loginBody: "Please enter your details to sign in.", teacherBody: "Use your invited staff account to open your teaching workspace.", registerBody: "Enter the access code provided by your teacher to activate your curriculum access.", fullName: "Full name", email: "Email address", password: "Password", accessCode: "Access code", login: "Sign in", createAccount: "Create account", student: "Student", teacher: "Teacher", noAccount: "Need an account?", already: "Already have an account?", getStarted: "Create student account", accessHelp: "Enter the access code provided by your teacher.", invalid: "We could not complete that request. Check your details and try again.", expired: "That access code has expired. Ask your teacher for a new one.", disabled: "That access code is no longer active. Ask your teacher for help.", limit: "That access code has reached its usage limit. Ask your teacher for a new one.", privacy: "Your account is private and your learning data is protected.", accessRequired: "Access required", accessRequiredBody: "Enter an access code provided by your teacher to access the Quantro AI curriculum.", unlock: "Unlock curriculum", showPassword: "Show password", hidePassword: "Hide password", accountType: "Account type",
  },
  ar: {
    studentLogin: "دخول الطالب", teacherLogin: "دخول المعلّم", create: "إنشاء حساب طالب", welcomeBack: "مرحبًا بعودتك", loginBody: "أدخل بياناتك لتسجيل الدخول.", teacherBody: "استخدم حساب الموظف المدعو لفتح مساحة التدريس الخاصة بك.", registerBody: "أدخل كود الدخول الذي قدمه معلّمك لتفعيل الوصول إلى المنهج.", fullName: "الاسم الكامل", email: "البريد الإلكتروني", password: "كلمة المرور", accessCode: "كود الدخول", login: "تسجيل الدخول", createAccount: "إنشاء الحساب", student: "طالب", teacher: "معلّم", noAccount: "هل تحتاج إلى حساب؟", already: "لديك حساب بالفعل؟", getStarted: "إنشاء حساب طالب", accessHelp: "أدخل كود الدخول الذي حصلت عليه من المعلّم.", invalid: "تعذر إكمال الطلب. راجع بياناتك وحاول مرة أخرى.", expired: "انتهت صلاحية كود الدخول. اطلب كودًا جديدًا من المعلّم.", disabled: "كود الدخول غير نشط الآن. اطلب المساعدة من المعلّم.", limit: "وصل كود الدخول إلى الحد الأقصى للاستخدام. اطلب كودًا جديدًا من المعلّم.", privacy: "حسابك خاص وبيانات تعلّمك محمية.", accessRequired: "يلزم كود دخول", accessRequiredBody: "أدخل كود دخول قدمه معلّمك للوصول إلى منهج Quantro AI.", unlock: "فتح المنهج", showPassword: "إظهار كلمة المرور", hidePassword: "إخفاء كلمة المرور", accountType: "نوع الحساب",
  },
} as const;

const adminLoginCopy = {
  en: { label: "Administrator", body: "Use your administrator account to manage teachers and platform content." },
  ar: { label: "المسؤول", body: "استخدم حساب المسؤول لإدارة المعلّمين ومحتوى المنصة." },
} as const;

function message(locale: AppLocale, error: string) {
  const t = copy[locale];
  if (error.includes("EXPIRED")) return t.expired;
  if (error.includes("DISABLED")) return t.disabled;
  if (error.includes("LIMIT")) return t.limit;
  return t.invalid;
}

function PasswordInput({ locale, value, onChange, invalid = false }: { locale: AppLocale; value: string; onChange: (value: string) => void; invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  const t = copy[locale];
  return <div className="password-field"><input id="password" className="text-input" type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} minLength={8} autoComplete="current-password" aria-invalid={invalid} required /><button className="icon-button" type="button" onClick={() => setVisible((state) => !state)} aria-label={visible ? t.hidePassword : t.showPassword}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>;
}

export function LoginForm({ locale, role }: { locale: AppLocale; role: "student" | "teacher" | "admin" }) {
  const t = copy[locale];
  const admin = adminLoginCopy[locale];
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, role }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "INVALID");
      const data = await response.json() as { session: { role: "student" | "teacher" | "admin"; curriculumAccess: boolean } };
      router.push(data.session.role === "admin" ? `/${locale}/admin` : data.session.role === "teacher" ? `/${locale}/teacher` : data.session.curriculumAccess ? `/${locale}/dashboard` : `/${locale}/access-required`);
      router.refresh();
    } catch (reason) {
      setError(message(locale, reason instanceof Error ? reason.message : ""));
    } finally {
      setPending(false);
    }
  }

  return <AuthFrame locale={locale} icon={role === "student" ? <UserRound /> : <ShieldCheck />} eyebrow={role === "admin" ? admin.label : role === "teacher" ? t.teacher : t.student} title={t.welcomeBack} body={role === "admin" ? admin.body : role === "teacher" ? t.teacherBody : t.loginBody}>
    {role !== "admin" && <nav className="auth-role-switch" aria-label={t.accountType}>
      <Link href={`/${locale}/auth/student/login`} data-active={role === "student"}><UserRound size={16} />{t.student}</Link>
      <Link href={`/${locale}/auth/teacher/login`} data-active={role === "teacher"}><ShieldCheck size={16} />{t.teacher}</Link>
    </nav>}
    <form onSubmit={submit} noValidate>
      <label className="field"><span>{t.email}</span><div className="input-with-icon"><Mail size={18} /><input className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" aria-invalid={Boolean(error)} required /></div></label>
      <label className="field"><span>{t.password}</span><PasswordInput locale={locale} value={password} onChange={setPassword} invalid={Boolean(error)} /></label>
      {error && <p className="feedback error auth-error" role="alert">{error}</p>}
      <button className="button auth-submit" disabled={pending} type="submit">{pending ? <LoaderCircle className="spin" /> : <ArrowRight className="flip-rtl" />}{t.login}</button>
    </form>
    {role === "student" ? <p className="auth-switch">{t.noAccount} <Link href={`/${locale}/auth/student/register`}>{t.getStarted}</Link></p> : role === "teacher" ? <p className="auth-switch">{t.noAccount} <Link href={`/${locale}/auth/student/login`}>{t.studentLogin}</Link></p> : null}
  </AuthFrame>;
}

export function RegisterForm({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName, email, password, accessCode, locale }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "INVALID");
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (reason) {
      setError(message(locale, reason instanceof Error ? reason.message : ""));
    } finally {
      setPending(false);
    }
  }

  return <AuthFrame locale={locale} icon={<KeyRound />} eyebrow={t.student} title={t.create} body={t.registerBody}>
    <form onSubmit={submit} noValidate>
      <label className="field"><span>{t.fullName}</span><div className="input-with-icon"><UserRound size={18} /><input className="text-input" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required /></div></label>
      <label className="field"><span>{t.email}</span><div className="input-with-icon"><Mail size={18} /><input className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div></label>
      <label className="field"><span>{t.password}</span><PasswordInput locale={locale} value={password} onChange={setPassword} invalid={Boolean(error)} /></label>
      <label className="field"><span>{t.accessCode}</span><div className="input-with-icon"><KeyRound size={18} /><input className="text-input code-input" value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} placeholder="QAI-7F9K2M" required /></div><small>{t.accessHelp}</small></label>
      {error && <p className="feedback error auth-error" role="alert">{error}</p>}
      <button className="button auth-submit" disabled={pending} type="submit">{pending ? <LoaderCircle className="spin" /> : <ArrowRight className="flip-rtl" />}{t.createAccount}</button>
    </form>
    <p className="auth-switch">{t.already} <Link href={`/${locale}/auth/student/login`}>{t.studentLogin}</Link></p>
  </AuthFrame>;
}

export function AccessRequiredForm({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/redeem-access-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessCode }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "INVALID");
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (reason) {
      setError(message(locale, reason instanceof Error ? reason.message : ""));
    } finally {
      setPending(false);
    }
  }

  return <AuthFrame locale={locale} icon={<LockKeyhole />} eyebrow={t.student} title={t.accessRequired} body={t.accessRequiredBody}>
    <form onSubmit={submit}><label className="field"><span>{t.accessCode}</span><div className="input-with-icon"><KeyRound size={18} /><input className="text-input code-input" value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} placeholder="QAI-7F9K2M" aria-invalid={Boolean(error)} required /></div><small>{t.accessHelp}</small></label>{error && <p className="feedback error auth-error" role="alert">{error}</p>}<button className="button auth-submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <LockKeyhole />}{t.unlock}</button></form>
    <p className="auth-switch"><Link href={`/${locale}/auth/student/register`}>{t.getStarted}</Link></p>
  </AuthFrame>;
}

function AuthFrame({ locale, icon, eyebrow, title, body, children }: { locale: AppLocale; icon: React.ReactNode; eyebrow: string; title: string; body: string; children: React.ReactNode }) {
  const t = copy[locale];
  return <main id="main-content" className="auth-page">
    <div className="auth-theme-toggle"><ThemePreferenceControl locale={locale} compact /></div>
    <div className="auth-orbit auth-orbit-one" aria-hidden="true" /><div className="auth-orbit auth-orbit-two" aria-hidden="true" />
    <section className="auth-card">
      <div className="auth-brand"><span className="auth-brand-mark"><BrainCircuit size={24} /></span><span><strong>Quantro AI</strong><small>{locale === "ar" ? "تعلّم. افهم. أنجز." : "Learn. Understand. Achieve."}</small></span></div>
      <div className="auth-card-copy"><span className="auth-role-badge">{icon}{eyebrow}</span><h1>{title}</h1><p>{body}</p></div>
      {children}
      <p className="auth-privacy"><LockKeyhole size={14} />{t.privacy}</p>
    </section>
  </main>;
}
