'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveProfile, type ActionState } from '@/app/actions';
import type { Profile } from '@/lib/types';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary" disabled={pending}>{pending ? 'שומר…' : label}</button>;
}

export function ProfileForm({ profile, from }: { profile: Profile; from: 'onboarding' | 'profile' }) {
  const [state, action] = useFormState<ActionState, FormData>(saveProfile, undefined);
  const [kind, setKind] = useState(profile.offer_kind ?? '');
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="from" value={from} />
      <label className="field">שם מלא<input className="input" name="full_name" defaultValue={profile.full_name} autoComplete="name" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">מספר רישיון תיווך<input className="input num" name="license_number" inputMode="numeric" dir="ltr" defaultValue={profile.license_number ?? ''} /></label>
        <label className="field">טלפון<input className="input num" name="phone" type="tel" dir="ltr" autoComplete="tel" defaultValue={profile.phone ?? ''} placeholder="050-0000000" /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="field">איך את/ה עובד/ת
          <select className="input" name="office_kind" defaultValue={profile.office_kind}>
            <option value="independent">עצמאי/ת</option><option value="office">משרד</option><option value="chain">רשת תיווך</option>
          </select>
        </label>
        <label className="field">שם המשרד<input className="input" name="office_name" defaultValue={profile.office_name ?? ''} /></label>
        <label className="field">עיר עיקרית<input className="input" name="city" defaultValue={profile.city ?? ''} /></label>
      </div>
      <fieldset className="card-mint grid gap-3 p-4">
        <legend className="px-1 text-sm font-bold text-green">החלוקה שאני מציע/ה על הנכסים שלי</legend>
        <p className="muted text-sm">את החלוקה קובעים המתווכים, לא Listo. אפשר לשנות אותה בכל נכס בנפרד.</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="offer_kind" value="pct" checked={kind === 'pct'} onChange={() => setKind('pct')} className="accent-green" /> לי, מסך העמלות</label>
          <input className="input w-24 num" name="offer_pct" type="number" min={1} max={99} defaultValue={profile.offer_pct ?? ''} disabled={kind !== 'pct'} aria-label="האחוז שלי" />
          <span className="muted">%</span>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="offer_kind" value="each" checked={kind === 'each'} onChange={() => setKind('each')} className="accent-green" /> כל אחד גובה מהלקוח שלו</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="offer_kind" value="" checked={kind === ''} onChange={() => setKind('')} className="accent-green" /> אחליט בכל נכס</label>
      </fieldset>
      {state?.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-good" role="status">{state.ok}</p>}
      <Submit label={from === 'onboarding' ? 'שליחה לאימות' : 'שמירה'} />
    </form>
  );
}
