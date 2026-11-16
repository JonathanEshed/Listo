'use client';
import { useRef, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createRequest, type ActionState } from '@/app/actions';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn-primary" disabled={pending}>{pending ? 'מפרסם…' : 'פרסום בלוח'}</button>;
}

export function RequestForm({ city }: { city: string | null }) {
  const [state, action] = useFormState<ActionState, FormData>(createRequest, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} id="new" className="card grid content-start gap-4 p-5" noValidate>
      <div>
        <h2 className="font-head text-lg font-bold text-green">פרסום קונה שלך</h2>
        <p className="muted mt-1 text-sm">הקונה מופיע בלי שם ובלי טלפון. מתווך עם נכס מתאים פונה אליך.</p>
      </div>
      <label className="field">ערים או שכונות, מופרדות בפסיק<input className="input" name="cities" defaultValue={city ?? ''} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">חדרים, לפחות
          <select className="input" name="min_rooms" defaultValue="3">{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <label className="field">תקציב עד (₪)<input className="input num" name="max_price" inputMode="numeric" dir="ltr" placeholder="3,000,000" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="mortgage_approved" className="accent-green" /> אישור עקרוני למשכנתא</label>
      <label className="field">הערה (בלי פרטים מזהים)<input className="input" name="note" maxLength={280} placeholder="לדוגמה: חייבת מעלית" /></label>
      {state?.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-good" role="status">{state.ok}</p>}
      <Submit />
    </form>
  );
}
