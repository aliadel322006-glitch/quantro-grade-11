"use client";

import { createBrowserClient } from "@supabase/ssr";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AppLocale } from "@/lib/i18n";

const copy = {
  en: { eyebrow: "Administrator security", title: "Two-step verification", body: "Administrator actions require a verified authenticator-app code in addition to your password.", enroll: "Set up authenticator app", scan: "Scan this QR code with an authenticator app, then enter its six-digit code.", code: "Authentication code", verify: "Verify and continue", ready: "Two-step verification is active for this browser session.", unavailable: "MFA setup is available only with a configured Supabase project.", invalid: "The code could not be verified. Try again.", loading: "Checking security status…" },
  ar: { eyebrow: "أمان المسؤول", title: "التحقق بخطوتين", body: "تتطلب إجراءات المسؤول رمزًا من تطبيق مصادقة تم التحقق منه بالإضافة إلى كلمة المرور.", enroll: "إعداد تطبيق المصادقة", scan: "امسح رمز QR بتطبيق مصادقة، ثم أدخل الرمز المكون من ستة أرقام.", code: "رمز المصادقة", verify: "تحقق وتابع", ready: "التحقق بخطوتين نشط لجلسة المتصفح هذه.", unavailable: "يتوفر إعداد MFA فقط عند ضبط مشروع Supabase.", invalid: "تعذر التحقق من الرمز. حاول مرة أخرى.", loading: "يجري فحص حالة الأمان…" },
} as const;

export function AdminMfaSetup({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(Boolean(client));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (!active) return;
      if (data?.currentLevel === "aal2") { setReady(true); setLoading(false); return; }
      return client.auth.mfa.listFactors().then(({ data: factors }) => {
        if (!active) return;
        const verified = factors?.totp.find((factor) => factor.status === "verified");
        if (verified) setFactorId(verified.id);
        setLoading(false);
      });
    }).catch(() => { if (active) { setError(t.invalid); setLoading(false); } });
    return () => { active = false; };
  }, [client, t.invalid]);

  async function enroll() {
    if (!client) return;
    setPending(true); setError("");
    try {
      const { data, error: enrollError } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Quantro AI administrator" });
      if (enrollError || !data) throw new Error();
      setFactorId(data.id); setQrCode(data.totp.qr_code);
    } catch { setError(t.invalid); } finally { setPending(false); }
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !factorId) return;
    setPending(true); setError("");
    try {
      const { error: verifyError } = await client.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (verifyError) throw new Error();
      window.location.assign(`/${locale}/admin`);
    } catch { setError(t.invalid); setPending(false); }
  }

  return <section className="admin-mfa-panel panel" aria-labelledby="admin-mfa-title">
    <header><span className="eyebrow">{t.eyebrow}</span><h1 id="admin-mfa-title">{t.title}</h1><p>{t.body}</p></header>
    {!client ? <p className="feedback error" role="alert">{t.unavailable}</p> : loading ? <p className="admin-directory-empty">{t.loading}</p> : ready ? <p className="admin-mfa-ready"><CheckCircle2 size={19} />{t.ready}</p> : !factorId ? <button className="button" type="button" disabled={pending} onClick={() => void enroll()}>{pending ? <LoaderCircle className="spin" /> : <ShieldCheck size={17} />}{t.enroll}</button> : <form className="admin-mfa-verify" onSubmit={verify} noValidate>
      {qrCode && <><p>{t.scan}</p><img src={`data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`} alt="Authenticator app QR code" /></>}
      <label className="field"><span>{t.code}</span><div className="input-with-icon"><KeyRound size={18} /><input className="text-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required /></div></label>
      {error && <p className="feedback error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={pending || code.length !== 6}>{pending ? <LoaderCircle className="spin" /> : <ShieldCheck size={17} />}{t.verify}</button>
    </form>}
  </section>;
}
