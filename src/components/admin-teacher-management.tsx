"use client";

import { Copy, LoaderCircle, MailPlus, ShieldAlert, ShieldCheck, UserRound, UserX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AppLocale } from "@/lib/i18n";
import type { TeacherDirectoryEntry } from "@/lib/auth/staff-provisioning";

const copy = {
  en: { eyebrow: "Institution management", title: "Teachers", body: "Invite and manage the teaching staff for this Quantro AI institution.", name: "Teacher display name", email: "Teacher email", invite: "Send invitation", loading: "Loading teachers…", empty: "No teachers have been invited yet.", active: "Active", invited: "Invitation pending", disabled: "Access disabled", disable: "Disable access", confirmDisable: "Disable this teacher’s access? They will be signed out and cannot use the staff workspace.", sent: "Invitation sent. The teacher receives a secure password-setup email.", duplicateStudent: "That email belongs to a student account and cannot be promoted through invitations.", duplicate: "An account already uses that email address.", unavailable: "We could not complete that request. Try again later.", mfa: "Set up two-step verification before managing teachers.", mfaLink: "Set up MFA", demo: "Local demo only: open this simulated invitation link in another browser session to set the teacher password.", copy: "Copy link", copied: "Copied", security: "Teacher roles are assigned by the server. Student accounts are never promoted by this form." },
  ar: { eyebrow: "إدارة المؤسسة", title: "المعلّمون", body: "ادعُ وأدر طاقم التدريس في مؤسسة Quantro AI هذه.", name: "الاسم الظاهر للمعلّم", email: "بريد المعلّم", invite: "إرسال الدعوة", loading: "يجري تحميل المعلّمين…", empty: "لم تتم دعوة معلّمين بعد.", active: "نشط", invited: "الدعوة معلّقة", disabled: "الوصول معطّل", disable: "تعطيل الوصول", confirmDisable: "هل تريد تعطيل وصول هذا المعلّم؟ سيتم تسجيل خروجه ولن يتمكن من استخدام مساحة التدريس.", sent: "تم إرسال الدعوة. سيتلقى المعلّم رسالة آمنة لتعيين كلمة المرور.", duplicateStudent: "هذا البريد لحساب طالب ولا يمكن ترقيته من خلال الدعوات.", duplicate: "يوجد حساب يستخدم هذا البريد بالفعل.", unavailable: "تعذر إكمال الطلب. حاول لاحقًا.", mfa: "أعد التحقق بخطوتين قبل إدارة المعلّمين.", mfaLink: "إعداد MFA", demo: "للعرض المحلي فقط: افتح رابط الدعوة المحاكى في جلسة متصفح أخرى لتعيين كلمة مرور المعلّم.", copy: "نسخ الرابط", copied: "تم النسخ", security: "يعيّن الخادم أدوار المعلّمين. لا تتم ترقية حسابات الطلاب من هذا النموذج." },
} as const;

type InviteResponse = { id: string; demoAcceptanceUrl?: string };

export function AdminTeacherManagement({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  const [teachers, setTeachers] = useState<readonly TeacherDirectoryEntry[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/teachers", { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        if (data.error === "MFA_REQUIRED") { setMfaRequired(true); return; }
        throw new Error();
      }
      const data = await response.json() as { teachers: TeacherDirectoryEntry[] };
      setTeachers(data.teachers);
    } catch { setNotice(t.unavailable); } finally { setLoading(false); }
  }, [t.unavailable]);

  useEffect(() => { void load(); }, [load]);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setNotice(""); setDemoUrl("");
    try {
      const response = await fetch("/api/v1/admin/teachers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName, email, locale }) });
      const data = await response.json().catch(() => ({})) as Partial<InviteResponse> & { error?: string };
      if (!response.ok) { setNotice(data.error === "ACCOUNT_EXISTS_STUDENT" ? t.duplicateStudent : data.error?.startsWith("ACCOUNT_EXISTS") ? t.duplicate : t.unavailable); return; }
      setDisplayName(""); setEmail(""); setNotice(t.sent);
      if (data.demoAcceptanceUrl) setDemoUrl(data.demoAcceptanceUrl);
      await load();
    } catch { setNotice(t.unavailable); } finally { setPending(false); }
  }

  async function disable(teacher: TeacherDirectoryEntry) {
    if (!window.confirm(t.confirmDisable)) return;
    setPending(true); setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/teachers/${encodeURIComponent(teacher.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "disable" }) });
      if (!response.ok) throw new Error();
      await load();
    } catch { setNotice(t.unavailable); } finally { setPending(false); }
  }

  async function copyDemoUrl() {
    try { await navigator.clipboard.writeText(demoUrl); setNotice(t.copied); } catch { setNotice(demoUrl); }
  }

  return <section className="admin-teacher-management panel" id="teachers" aria-labelledby="teacher-management-title">
    <header className="admin-management-head"><div><span className="eyebrow">{t.eyebrow}</span><h1 id="teacher-management-title">{t.title}</h1><p>{t.body}</p></div><span className="card-icon"><ShieldCheck aria-hidden="true" /></span></header>
    {mfaRequired && <p className="feedback error" role="alert">{t.mfa} <Link href={`/${locale}/admin/security`}>{t.mfaLink}</Link></p>}
    <form className="admin-invite-form" onSubmit={invite} noValidate>
      <label className="field"><span>{t.name}</span><div className="input-with-icon"><UserRound size={18} /><input className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required /></div></label>
      <label className="field"><span>{t.email}</span><div className="input-with-icon"><MailPlus size={18} /><input className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div></label>
      <button className="button" type="submit" disabled={pending || mfaRequired}>{pending ? <LoaderCircle className="spin" /> : <MailPlus size={17} />}{t.invite}</button>
    </form>
    {notice && <p className="feedback" role="status">{notice}</p>}
    {demoUrl && <div className="admin-demo-invite"><p>{t.demo}</p><code>{demoUrl}</code><button className="button ghost small" type="button" onClick={() => void copyDemoUrl()}><Copy size={15} />{t.copy}</button></div>}
    <p className="admin-security-note"><ShieldAlert size={16} />{t.security}</p>
    <div className="teacher-directory" aria-live="polite">
      {loading ? <p className="admin-directory-empty">{t.loading}</p> : teachers.length === 0 ? <p className="admin-directory-empty">{t.empty}</p> : teachers.map((teacher) => <article key={teacher.id} className="teacher-directory-row">
        <div className="teacher-directory-person"><span className="avatar">{teacher.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{teacher.displayName}</strong><small>{teacher.email}</small></span></div>
        <span className={`teacher-status status-${teacher.status}`}>{teacher.status === "active" ? t.active : teacher.status === "invited" ? t.invited : t.disabled}</span>
        {teacher.status !== "disabled" ? <button className="button ghost small danger" type="button" disabled={pending} onClick={() => void disable(teacher)}><UserX size={15} />{t.disable}</button> : <span />}
      </article>)}
    </div>
  </section>;
}
