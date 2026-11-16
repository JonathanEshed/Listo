'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { requestCoop, type ActionState } from '@/app/actions';
import { ils } from '@/lib/format';
import type { SplitKind } from '@/lib/types';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn-primary" disabled={pending}>{pending ? 'שולח…' : 'חתימה ושליחה'}</button>;
}

/** The buyer's agent asks to cooperate: buyer + brokerage order → accept or counter the split → sign the agreement. */
export function CoopForm({ listingId, price, offerKind, offerPct, agreement }: {
  listingId: string; price: number; offerKind: SplitKind; offerPct: number | null; agreement: string;
}) {
  const [state, action] = useFormState<ActionState, FormData>(requestCoop, undefined);
  const [choice, setChoice] = useState<'accept' | 'counter'>('accept');
  const [counter, setCounter] = useState(offerPct ?? 50);
  const side = price * 0.02; // example: 2% from each side, before VAT
  const pct = choice === 'accept' ? (offerKind === 'pct' ? offerPct ?? 50 : null) : counter;
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="listing_id" value={listingId} />
      <label className="field">שם הקונה<input className="input" name="buyer_label" placeholder="לדוגמה: משפחת לוי" /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="order" className="mt-1 accent-green" /> הקונה חתם אצלי על הזמנת שירותי תיווך לנכס הזה</label>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-bold">חלוקת העמלה</legend>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-mint p-1 text-sm font-semibold" role="radiogroup">
          {(['accept', 'counter'] as const).map((c) => (
            <label key={c} className={`cursor-pointer rounded-full px-3 py-2 text-center transition ${choice === c ? 'bg-green text-cream' : 'text-green'}`}>
              <input type="radio" name="choice" value={c} checked={choice === c} onChange={() => setChoice(c)} className="sr-only" />
              {c === 'accept' ? 'מקבל/ת את ההצעה' : 'הצעה נגדית'}
            </label>
          ))}
        </div>
        {choice === 'counter' && (
          <label className="field">למתווך המפרסם, מסך העמלות: <span className="num">{counter}%</span>
            <input type="range" name="counter_pct" min={20} max={80} step={5} value={counter} onChange={(e) => setCounter(Number(e.target.value))} className="accent-green" />
          </label>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-mint p-3"><span className="muted block text-xs">המתווך המפרסם</span><b className="font-head text-xl num">{pct == null ? ils(side) : ils(side * 2 * pct / 100)}</b></div>
          <div className="rounded-xl bg-mint p-3"><span className="muted block text-xs">אתה</span><b className="font-head text-xl num">{pct == null ? ils(side) : ils(side * 2 * (100 - pct) / 100)}</b></div>
        </div>
        <p className="muted text-xs">חישוב לדוגמה: 2% מכל צד, לפני מע״מ. Listo לא קובעת חלוקה ולא לוקחת אחוז מהעמלה.</p>
      </fieldset>

      <details className="rounded-xl border border-line p-4 text-sm">
        <summary className="cursor-pointer font-bold text-green">ההסכם הסטנדרטי</summary>
        <div className="muted mt-3 whitespace-pre-line leading-relaxed">{agreement.replace(/\*\*/g, '')}</div>
      </details>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="agree" className="mt-1 accent-green" /> קראתי ואני חותם/ת על ההסכם</label>
      {state?.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
      <Submit />
    </form>
  );
}
