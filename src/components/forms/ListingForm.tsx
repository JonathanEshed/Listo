'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createListing, type ActionState } from '@/app/actions';
import type { Profile } from '@/lib/types';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn-primary" disabled={pending}>{pending ? 'מעלה…' : 'העלאה למאגר'}</button>;
}

export function ListingForm({ profile }: { profile: Profile }) {
  const [state, action] = useFormState<ActionState, FormData>(createListing, undefined);
  const [kind, setKind] = useState(profile.offer_kind ?? 'pct');
  return (
    <form action={action} className="grid gap-6" noValidate>
      <section className="card grid gap-4 p-5">
        <h2 className="font-head text-lg font-bold text-green">הנכס</h2>
        <label className="field">כותרת<input className="input" name="title" placeholder="לדוגמה: 4 חדרים עם מרפסת שמש" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">עיר<input className="input" name="city" defaultValue={profile.city ?? ''} /></label>
          <label className="field">שכונה<input className="input" name="area" /></label>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="field">חדרים<input className="input num" name="rooms" inputMode="decimal" /></label>
          <label className="field">מ״ר<input className="input num" name="sqm" inputMode="numeric" /></label>
          <label className="field">קומה<input className="input num" name="floor" inputMode="numeric" /></label>
          <label className="field">מחיר מבוקש (₪)<input className="input num" name="price" inputMode="numeric" dir="ltr" placeholder="2,890,000" /></label>
        </div>
        <label className="field">תיאור<textarea className="input min-h-28" name="description" maxLength={1500} /></label>
        <label className="field">תמונות (עד 8)<input className="input" name="photos" type="file" accept="image/*" multiple /></label>
        <label className="field">קישור לסרטון<input className="input" name="video_url" type="url" dir="ltr" placeholder="https://" /></label>
      </section>

      <section className="card-mint grid gap-3 p-5">
        <h2 className="font-head text-lg font-bold text-green">הצעת החלוקה שלך</h2>
        <p className="muted text-sm">המתווך של הקונה יראה את ההצעה, ויוכל לקבל אותה או להציע הצעה נגדית. Listo לא קובעת חלוקה.</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="offer_kind" value="pct" checked={kind === 'pct'} onChange={() => setKind('pct')} className="accent-green" /> לי, מסך העמלות</label>
          <input className="input w-24 num" name="offer_pct" type="number" min={1} max={99} defaultValue={profile.offer_pct ?? ''} disabled={kind !== 'pct'} aria-label="האחוז שלי" />
          <span className="muted">%</span>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="offer_kind" value="each" checked={kind === 'each'} onChange={() => setKind('each')} className="accent-green" /> כל אחד גובה מהלקוח שלו</label>
      </section>

      <section className="card grid gap-4 p-5">
        <div>
          <h2 className="font-head text-lg font-bold text-green">פרטים חסויים</h2>
          <p className="muted mt-1 text-sm">נחשפים רק למתווך שחתם איתך על הסכם שיתוף פעולה.</p>
        </div>
        <label className="field">כתובת מלאה<input className="input" name="address_full" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">שם המוכר<input className="input" name="seller_name" /></label>
          <label className="field">טלפון המוכר<input className="input num" name="seller_phone" type="tel" dir="ltr" /></label>
        </div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="has_signed_order" className="mt-1 accent-green" /> יש לי הזמנת שירותי תיווך חתומה מהמוכר על הנכס הזה</label>
      </section>

      {state?.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
      <div><Submit /></div>
    </form>
  );
}
