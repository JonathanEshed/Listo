'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/Logo';
import { devLoginEnabled, devSignIn } from './dev';

/** Sign-in with a one-time code sent by email (no passwords). */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dev, setDev] = useState(false);

  useEffect(() => {
    devLoginEnabled().then(setDev).catch(() => {});
  }, []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('כתבו כתובת מייל תקינה.');
    if (dev) return setStep('code'); // localhost dev mode: no email is sent
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return setError('לא הצלחנו לשלוח קוד. נסו שוב בעוד דקה.');
    setStep('code');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) return setError('הקוד הוא 6 ספרות.');
    setBusy(true);
    if (dev) {
      const r = await devSignIn(email, code);
      setBusy(false);
      if (!r.ok) return setError(r.error ?? 'כניסת הפיתוח נכשלה.');
      router.replace('/');
      router.refresh();
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) return setError('הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש.');
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-6">
          <h1 className="font-head text-2xl font-bold">כניסה לחשבון</h1>
          {step === 'email' ? (
            <form onSubmit={sendCode} className="mt-5 grid gap-4" noValidate>
              <p className="muted text-sm">נשלח לך קוד חד־פעמי במייל. בלי סיסמאות.</p>
              <label className="field">
                מייל
                <input className="input" type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </label>
              {error && <p className="text-sm text-bad" role="alert">{error}</p>}
              <button className="btn-primary" disabled={busy}>{busy ? 'שולח…' : 'שליחת קוד'}</button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-5 grid gap-4" noValidate>
              {dev ? (
                <p className="muted text-sm">מצב פיתוח (localhost): לא נשלח מייל. הקלידו את קוד הפיתוח.</p>
              ) : (
                <p className="muted text-sm">שלחנו קוד בן 6 ספרות ל־<span dir="ltr" className="font-semibold text-ink">{email}</span>.</p>
              )}
              <label className="field">
                הקוד
                <input className="input text-center text-xl tracking-[.5em] num" inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              </label>
              {error && <p className="text-sm text-bad" role="alert">{error}</p>}
              <button className="btn-primary" disabled={busy}>{busy ? 'בודק…' : 'כניסה'}</button>
              <button type="button" className="text-sm font-semibold text-green" onClick={() => { setStep('email'); setCode(''); }}>שינוי מייל או קוד חדש</button>
            </form>
          )}
        </div>
        <p className="muted mt-6 text-center text-xs">Listo לא לוקחת עמלות תיווך. הכניסה מיועדת למתווכים מורשים.</p>
      </div>
    </main>
  );
}
