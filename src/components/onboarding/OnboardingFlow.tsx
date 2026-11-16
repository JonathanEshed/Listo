'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveProfile, type ActionState } from '@/app/actions';
import { Logo } from '@/components/Logo';
import type { OfficeKind, Profile, SplitKind } from '@/lib/types';

type Data = {
  full_name: string;
  phone: string;
  office_kind: OfficeKind;
  office_name: string;
  city: string;
  license_number: string;
  attest: boolean;
  offer_kind: SplitKind | '';
  offer_pct: string;
};

const STEPS = [
  { key: 'you', label: 'פרטים אישיים', hint: 'שם וטלפון' },
  { key: 'work', label: 'איך את/ה עובד/ת', hint: 'משרד ואזור' },
  { key: 'license', label: 'רישיון תיווך', hint: 'לאימות מול הרשם' },
  { key: 'split', label: 'הצעת החלוקה', hint: 'על הנכסים שלך' },
  { key: 'review', label: 'סיכום', hint: 'בדיקה ושליחה' },
] as const;

const CITIES = ['תל אביב-יפו', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נתניה', 'באר שבע', 'חולון', 'בני ברק', 'רמת גן', 'רחובות', 'אשקלון', 'בת ים', 'הרצליה', 'כפר סבא', 'חדרה', 'מודיעין-מכבים-רעות', 'רעננה', 'גבעתיים', 'הוד השרון', 'ראש העין', 'נס ציונה', 'קריית אונו', 'רמת השרון', 'יבנה', 'אור יהודה', 'גבעת שמואל', 'קיסריה', 'זכרון יעקב'];

const OFFICE: { value: OfficeKind; title: string; sub: string; icon: JSX.Element }[] = [
  { value: 'independent', title: 'עצמאי/ת', sub: 'עובד/ת לבד', icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" /> },
  { value: 'office', title: 'משרד', sub: 'צוות של כמה מתווכים', icon: <path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5M4 20h16" /> },
  { value: 'chain', title: 'רשת תיווך', sub: 'סניף או זכיין', icon: <path d="M3 20V10l5-3 5 3v10M13 20v-7l4-2.5 4 2.5v7M3 20h18M7 14h2M16 15h2" /> },
];

const normPhone = (s: string) => s.replace(/[^\d+]/g, '');
const phoneOk = (s: string) => /^0(5\d|[2-9])\d{7}$/.test(normPhone(s).replace(/^\+972/, '0'));

function validate(step: number, d: Data): string | null {
  if (step === 0) {
    if (d.full_name.trim().split(/\s+/).length < 2) return 'כתבו שם פרטי ושם משפחה.';
    if (!phoneOk(d.phone)) return 'מספר הטלפון לא נראה תקין. לדוגמה 050-1234567.';
  }
  if (step === 1) {
    if (d.office_kind !== 'independent' && d.office_name.trim().length < 2) return 'מה שם המשרד?';
    if (d.city.trim().length < 2) return 'באיזו עיר את/ה עובד/ת בעיקר?';
  }
  if (step === 2) {
    if (!/^\d{3,10}$/.test(d.license_number)) return 'מספר הרישיון מורכב מספרות בלבד.';
    if (!d.attest) return 'צריך לאשר שהרישיון בתוקף.';
  }
  if (step === 3 && d.offer_kind === 'pct') {
    const n = Number(d.offer_pct);
    if (!Number.isInteger(n) || n < 1 || n > 99) return 'האחוז צריך להיות מספר שלם בין 1 ל־99.';
  }
  return null;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary h-12 px-7" disabled={pending}>
      {pending ? <><Spinner /> שולח…</> : 'שליחה לאימות'}
    </button>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
}

function Check({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function OnboardingFlow({ profile }: { profile: Profile }) {
  const [state, action] = useFormState<ActionState, FormData>(saveProfile, undefined);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [error, setError] = useState('');
  const [d, setD] = useState<Data>({
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    office_kind: profile.office_kind ?? 'independent',
    office_name: profile.office_name ?? '',
    city: profile.city ?? '',
    license_number: profile.license_number ?? '',
    attest: false,
    offer_kind: profile.offer_kind ?? '',
    offer_pct: profile.offer_pct ? String(profile.offer_pct) : '50',
  });
  const panel = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Data>(k: K, v: Data[K]) => { setD((x) => ({ ...x, [k]: v })); setError(''); };

  // focus the first field of each step (keyboard users keep their place)
  useEffect(() => {
    const el = panel.current?.querySelector<HTMLElement>('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [data-autofocus]');
    el?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => { if (state?.error) setError(state.error); }, [state]);

  const last = STEPS.length - 1;
  function next() {
    const e = validate(step, d);
    if (e) return setError(e);
    setDir(1); setStep((s) => Math.min(s + 1, last));
  }
  function back() { setError(''); setDir(-1); setStep((s) => Math.max(s - 1, 0)); }
  function goto(i: number) {
    if (i >= step) return;
    setError(''); setDir(-1); setStep(i);
  }

  const officeTitle = OFFICE.find((o) => o.value === d.office_kind)!.title;
  const splitText = d.offer_kind === 'pct' ? `${d.offer_pct}% לי · ${100 - Number(d.offer_pct || 0)}% למתווך של הקונה` : d.offer_kind === 'each' ? 'כל אחד גובה מהלקוח שלו' : 'אחליט בכל נכס בנפרד';

  return (
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
      {/* ───── form side */}
      <main className="flex min-h-dvh flex-col px-5 pb-10 pt-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-sm text-muted num">שלב {step + 1} מתוך {STEPS.length}</span>
        </div>

        {/* segmented progress (mobile + tablet) */}
        <div className="mt-6 grid grid-cols-5 gap-1.5 lg:hidden" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.key} className="h-1 overflow-hidden rounded-full bg-line">
              <span className="block h-full origin-right rounded-full bg-green transition-transform duration-500 ease-out" style={{ transform: `scaleX(${i <= step ? 1 : 0})` }} />
            </span>
          ))}
        </div>

        <form
          action={action}
          noValidate
          className="mx-auto mt-10 flex w-full max-w-[560px] flex-1 flex-col lg:mt-[8vh]"
          onSubmit={(e) => {
            const firstBad = [0, 1, 2, 3].find((i) => validate(i, d));
            if (firstBad !== undefined) { e.preventDefault(); setDir(-1); setStep(firstBad); setError(validate(firstBad, d)!); }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && step < last && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); next(); }
          }}
        >
          {/* everything the server needs travels in hidden fields */}
          <input type="hidden" name="from" value="onboarding" />
          <input type="hidden" name="full_name" value={d.full_name.trim()} />
          <input type="hidden" name="phone" value={normPhone(d.phone)} />
          <input type="hidden" name="office_kind" value={d.office_kind} />
          <input type="hidden" name="office_name" value={d.office_kind === 'independent' ? '' : d.office_name.trim()} />
          <input type="hidden" name="city" value={d.city.trim()} />
          <input type="hidden" name="license_number" value={d.license_number} />
          <input type="hidden" name="offer_kind" value={d.offer_kind} />
          <input type="hidden" name="offer_pct" value={d.offer_kind === 'pct' ? d.offer_pct : ''} />

          <div key={step} ref={panel} className={dir === 1 ? 'step-in-fwd' : 'step-in-back'}>
            {step === 0 && (
              <section aria-labelledby="h-you">
                <p className="eyebrow">ברוכים הבאים ל־Listo</p>
                <h1 id="h-you" className="ob-title">נתחיל בהיכרות</h1>
                <p className="ob-lead">כך יראו אותך מתווכים אחרים בקהילה. הטלפון נחשף רק למי שחתם איתך על שיתוף פעולה.</p>
                <div className="mt-8 grid gap-5">
                  <label className="field">שם מלא
                    <input className="input-lg" value={d.full_name} onChange={(e) => set('full_name', e.target.value)} autoComplete="name" placeholder="נועה לוי" />
                  </label>
                  <label className="field">טלפון נייד
                    <input className="input-lg num" value={d.phone} onChange={(e) => set('phone', e.target.value)} type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="050-1234567" />
                  </label>
                  <p className="text-sm text-muted">המייל שלך: <span dir="ltr" className="font-medium text-ink">{profile.email}</span></p>
                </div>
              </section>
            )}

            {step === 1 && (
              <section aria-labelledby="h-work">
                <p className="eyebrow">העבודה שלך</p>
                <h1 id="h-work" className="ob-title">איך את/ה עובד/ת?</h1>
                <p className="ob-lead">Listo פתוחה לכל המתווכים המורשים: עצמאים, משרדים ורשתות.</p>
                <div role="radiogroup" aria-label="סוג פעילות" className="mt-8 grid gap-3 sm:grid-cols-3">
                  {OFFICE.map((o, i) => {
                    const on = d.office_kind === o.value;
                    return (
                      <button
                        key={o.value} type="button" role="radio" aria-checked={on} data-autofocus={i === 0 ? '' : undefined}
                        onClick={() => set('office_kind', o.value)}
                        className={`tile ${on ? 'tile-on' : ''}`}
                      >
                        <span className="flex items-center justify-between">
                          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{o.icon}</svg>
                          <span className={`grid h-5 w-5 place-items-center rounded-full border transition-colors duration-200 ${on ? 'border-green bg-green text-white' : 'border-line'}`}>{on && <Check className="h-3 w-3" />}</span>
                        </span>
                        <span className="mt-5 block text-[17px] font-bold">{o.title}</span>
                        <span className="mt-0.5 block text-sm text-muted">{o.sub}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {d.office_kind !== 'independent' && (
                    <label className="field">{d.office_kind === 'chain' ? 'שם הרשת והסניף' : 'שם המשרד'}
                      <input className="input-lg" value={d.office_name} onChange={(e) => set('office_name', e.target.value)} placeholder={d.office_kind === 'chain' ? 'לדוגמה: רשת · סניף מרכז' : 'שם המשרד'} />
                    </label>
                  )}
                  <label className={`field ${d.office_kind === 'independent' ? 'sm:col-span-2' : ''}`}>עיר עיקרית
                    <input className="input-lg" list="ob-cities" value={d.city} onChange={(e) => set('city', e.target.value)} placeholder="התחילו להקליד" />
                    <datalist id="ob-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
                  </label>
                </div>
              </section>
            )}

            {step === 2 && (
              <section aria-labelledby="h-lic">
                <p className="eyebrow">אימות</p>
                <h1 id="h-lic" className="ob-title">מספר רישיון התיווך</h1>
                <p className="ob-lead">הקהילה סגורה למתווכים מורשים בלבד. אנחנו בודקים כל רישיון מול רשם המתווכים במשרד המשפטים, בדרך כלל תוך יום עבודה.</p>
                <label className="field mt-8">מספר רישיון
                  <input className="input-lg num text-2xl tracking-[.18em]" value={d.license_number} onChange={(e) => set('license_number', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" dir="ltr" placeholder="000000" />
                </label>
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-[#F6F8F5] p-4 text-[15px] leading-relaxed">
                  <input type="checkbox" checked={d.attest} onChange={(e) => set('attest', e.target.checked)} className="mt-1 h-[18px] w-[18px] shrink-0 accent-green" />
                  <span>אני מאשר/ת שהרישיון בתוקף ושייך לי, ושאשתמש בקהילה רק לעסקאות שיש לי בהן הזמנת תיווך חתומה.</span>
                </label>
                <ul className="mt-6 grid gap-2.5 text-sm text-muted">
                  <li className="flex gap-2.5"><span className="mt-0.5 text-green"><Check /></span>המספר משמש לאימות בלבד ולא מוצג למתווכים אחרים.</li>
                  <li className="flex gap-2.5"><span className="mt-0.5 text-green"><Check /></span>אחרי האימות יופיע ליד שמך הסימון ״מתווך מאומת״.</li>
                </ul>
              </section>
            )}

            {step === 3 && (
              <section aria-labelledby="h-split">
                <p className="eyebrow">שיתוף פעולה</p>
                <h1 id="h-split" className="ob-title">איזו חלוקה תציע/י על הנכסים שלך?</h1>
                <p className="ob-lead">Listo לא קובעת חלוקה ולא לוקחת עמלות תיווך. זו ברירת המחדל שלך, ובכל נכס אפשר לשנות אותה.</p>
                <div role="radiogroup" aria-label="הצעת חלוקה" className="mt-8 grid gap-3">
                  {([
                    { v: 'pct', t: 'חלוקה באחוזים', s: 'אחוז מסך העמלות לך, והשאר למתווך של הקונה' },
                    { v: 'each', t: 'כל אחד מהלקוח שלו', s: 'את/ה גובה מהמוכר, והמתווך השני גובה מהקונה' },
                    { v: '', t: 'אחליט בכל נכס', s: 'בלי ברירת מחדל. תבחר/י כשמעלים נכס' },
                  ] as const).map((o, i) => {
                    const on = d.offer_kind === o.v;
                    return (
                      <div key={o.t} className={`tile !p-0 ${on ? 'tile-on' : ''}`}>
                        <button type="button" role="radio" aria-checked={on} data-autofocus={i === 0 ? '' : undefined} onClick={() => set('offer_kind', o.v)} className="flex w-full items-center gap-4 p-4 text-right">
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-200 ${on ? 'border-green bg-green' : 'border-[#C9CFC8]'}`}>{on && <span className="h-2 w-2 rounded-full bg-white" />}</span>
                          <span className="min-w-0">
                            <span className="block font-bold">{o.t}</span>
                            <span className="block text-sm text-muted">{o.s}</span>
                          </span>
                        </button>
                        {o.v === 'pct' && on && (
                          <div className="reveal flex flex-wrap items-center gap-4 border-t border-line px-4 py-4">
                            <div className="flex items-center rounded-full bg-white ring-1 ring-line">
                              <button type="button" aria-label="הורדה" onClick={() => set('offer_pct', String(Math.max(1, Number(d.offer_pct || 50) - 5)))} className="stepper">−</button>
                              <input aria-label="האחוז שלי" className="w-14 bg-transparent text-center text-lg font-bold outline-none num" inputMode="numeric" dir="ltr" value={d.offer_pct} onChange={(e) => set('offer_pct', e.target.value.replace(/\D/g, '').slice(0, 2))} />
                              <button type="button" aria-label="העלאה" onClick={() => set('offer_pct', String(Math.min(99, Number(d.offer_pct || 50) + 5)))} className="stepper">+</button>
                            </div>
                            <SplitBar mine={Number(d.offer_pct) || 0} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 4 && (
              <section aria-labelledby="h-rev">
                <p className="eyebrow">כמעט סיימנו</p>
                <h1 id="h-rev" className="ob-title">בדיקה אחרונה</h1>
                <p className="ob-lead">אפשר לחזור ולתקן כל פרט. אחרי השליחה נבדוק את הרישיון ונעדכן אותך במייל.</p>
                <dl className="mt-8 divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
                  {[
                    { k: 'שם', v: d.full_name, s: 0 },
                    { k: 'טלפון', v: d.phone, s: 0, ltr: true },
                    { k: 'פעילות', v: d.office_kind === 'independent' ? officeTitle : `${officeTitle} · ${d.office_name}`, s: 1 },
                    { k: 'עיר', v: d.city, s: 1 },
                    { k: 'רישיון', v: d.license_number, s: 2, ltr: true },
                    { k: 'חלוקה', v: splitText, s: 3 },
                  ].map((r) => (
                    <div key={r.k} className="flex items-center gap-4 bg-white px-4 py-3.5">
                      <dt className="w-16 shrink-0 text-sm text-muted">{r.k}</dt>
                      <dd className="min-w-0 flex-1 truncate font-medium" dir={r.ltr ? 'ltr' : undefined} style={r.ltr ? { textAlign: 'right' } : undefined}>{r.v}</dd>
                      <button type="button" onClick={() => goto(r.s)} className="text-sm font-semibold text-green hover:underline">עריכה</button>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          <div className="mt-6 min-h-[24px]">
            {error && <p key={error} className="shake text-sm font-medium text-bad" role="alert">{error}</p>}
          </div>

          {/* actions */}
          <div className="mt-auto flex items-center gap-3 pt-8">
            {step > 0 && (
              <button type="button" onClick={back} className="btn h-12 px-5 text-green hover:bg-mint">חזרה</button>
            )}
            <span className="flex-1" />
            {step < last ? (
              <button type="button" onClick={next} className="btn-primary h-12 px-7">
                המשך
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5" /></svg>
              </button>
            ) : (
              <Submit />
            )}
          </div>
        </form>
      </main>

      {/* ───── side rail (desktop) */}
      <aside className="relative hidden overflow-hidden bg-green text-cream lg:flex lg:flex-col lg:px-10 lg:py-10">
        <svg viewBox="0 0 64 64" className="pointer-events-none absolute -bottom-24 -left-24 h-[420px] w-[420px] opacity-[.07]" aria-hidden="true">
          <path d="M6 46L24 26L42 46" fill="none" stroke="#F2EEE4" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M22 46L40 26L58 46" fill="none" stroke="#D9A266" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-semibold text-ochre-light">הצטרפות לקהילה</p>
        <ol className="relative mt-10 grid gap-1">
          {STEPS.map((s, i) => {
            const done = i < step, cur = i === step;
            return (
              <li key={s.key}>
                <button type="button" onClick={() => goto(i)} disabled={i >= step}
                  className={`flex w-full items-center gap-4 rounded-xl px-3 py-3 text-right transition-colors duration-200 ${done ? 'hover:bg-white/5' : ''} disabled:cursor-default`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-all duration-300 ease-out num
                    ${done ? 'bg-ochre-light text-green' : cur ? 'bg-cream text-green' : 'ring-1 ring-cream/25 text-cream/50'}`}>
                    {done ? <Check /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-semibold transition-colors duration-200 ${cur || done ? 'text-cream' : 'text-cream/50'}`}>{s.label}</span>
                    <span className={`block text-sm ${cur ? 'text-cream/70' : 'text-cream/40'}`}>{s.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="relative mt-auto grid gap-3 border-t border-cream/15 pt-6 text-sm text-cream/80">
          <p className="flex gap-2.5"><span className="text-ochre-light"><Check /></span>בלי עמלות תיווך. החלוקה נשארת ביניכם.</p>
          <p className="flex gap-2.5"><span className="text-ochre-light"><Check /></span>רק מתווכים עם רישיון מאומת.</p>
          <p className="flex gap-2.5"><span className="text-ochre-light"><Check /></span>הסכם שיתוף פעולה אחד, חתום דיגיטלית.</p>
        </div>
      </aside>
    </div>
  );
}

function SplitBar({ mine }: { mine: number }) {
  const m = Math.min(99, Math.max(0, mine));
  return (
    <div className="min-w-[180px] flex-1">
      <div className="flex h-2 overflow-hidden rounded-full bg-ochre-light/60">
        <span className="h-full bg-green transition-[width] duration-300 ease-out" style={{ width: `${m}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted num">
        <span>לך {m}%</span><span>למתווך הקונה {100 - m}%</span>
      </div>
    </div>
  );
}
