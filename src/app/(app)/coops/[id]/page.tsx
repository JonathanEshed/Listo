import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAgent } from '@/lib/auth';
import { cancelCoop, reportDeal, resolveDeal, respondCoop } from '@/app/actions';
import { COOP_STATUS, date, dateTime, ils, splitLabel } from '@/lib/format';
import type { Coop, Deal } from '@/lib/types';

type Row = Coop & {
  listing: { id: string; title: string; city: string; area: string | null; price: number } | null;
  owner: { full_name: string; office_name: string | null; phone: string | null } | null;
  requester: { full_name: string; office_name: string | null; phone: string | null } | null;
};

export default async function CoopPage({ params, searchParams }: { params: { id: string }; searchParams: { e?: string } }) {
  const { supabase, profile } = await requireAgent();
  const { data: c } = await supabase
    .from('coops')
    .select('*, listing:listings(id, title, city, area, price), owner:profiles!coops_owner_id_fkey(full_name, office_name, phone), requester:profiles!coops_requester_id_fkey(full_name, office_name, phone)')
    .eq('id', params.id)
    .single<Row>();
  if (!c) notFound();
  const isOwner = c.owner_id === profile.id;
  const signed = c.status === 'signed';
  const [{ data: priv }, { data: deal }, { data: agreement }] = await Promise.all([
    signed ? supabase.from('listing_private').select('*').eq('listing_id', c.listing_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('deals').select('*').eq('coop_id', c.id).maybeSingle<Deal>(),
    supabase.from('agreement_versions').select('*').eq('version', c.agreement_version).single(),
  ]);
  const counterpart = isOwner ? c.requester : c.owner;
  const open = ['pending', 'countered'].includes(c.status);

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <Link href="/coops" className="text-sm font-semibold text-green">→ כל שיתופי הפעולה</Link>
      <div className="grid gap-1">
        <p className="eyebrow num" dir="ltr">{c.ref_code}</p>
        <h1 className="h1">{c.listing?.title} · {c.listing?.city}</h1>
        <p className="muted">{isOwner ? `${c.requester?.full_name} מביא/ה קונה לנכס שלך` : `מול ${c.owner?.full_name}, ${c.owner?.office_name ?? ''}`}</p>
      </div>
      {searchParams.e && <p className="rounded-xl bg-red-50 p-3 text-sm text-bad" role="alert">{searchParams.e}</p>}

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div><span className="muted block text-xs">סטטוס</span><b className="text-green">{COOP_STATUS[c.status]}</b></div>
        <div><span className="muted block text-xs">הקונה</span><b>{c.buyer_label}</b> <span className="text-sm text-good">✓ הזמנת תיווך חתומה</span></div>
        <div><span className="muted block text-xs">הצעת המתווך המפרסם</span><b>{splitLabel(c.offered_kind, c.offered_pct)}</b></div>
        <div><span className="muted block text-xs">החלוקה בהסכם</span><b>{splitLabel(c.final_kind, c.final_pct)}</b>{c.status === 'countered' && <span className="pill mr-2 bg-cream text-ochre">הצעה נגדית</span>}</div>
        <div><span className="muted block text-xs">חתימת המתווך של הקונה</span><b className="num">{dateTime(c.requester_signed_at) || '—'}</b></div>
        <div><span className="muted block text-xs">חתימת המתווך המפרסם</span><b className="num">{dateTime(c.owner_signed_at) || '—'}</b></div>
        {c.expires_at && <div className="sm:col-span-2"><span className="muted block text-xs">ההפניה בתוקף עד</span><b className="num">{date(c.expires_at)}</b></div>}
      </div>

      {isOwner && open && (
        <div className="card-mint grid gap-3 p-5">
          <b>{c.status === 'countered' ? `${c.requester?.full_name} מציע/ה חלוקה אחרת: ${splitLabel(c.final_kind, c.final_pct)}` : 'המתווך של הקונה קיבל את הצעת החלוקה שלך'}</b>
          <p className="muted text-sm">בחתימה את/ה מסכים/ה להסכם הסטנדרטי (גרסה {c.agreement_version}). אחרי החתימה, הכתובת ופרטי המוכר ייחשפו למתווך של הקונה.</p>
          <div className="flex flex-wrap gap-2">
            <form action={respondCoop}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="accept" value="yes" /><button className="btn-primary">אישור וחתימה</button></form>
            <form action={respondCoop}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="accept" value="no" /><button className="btn-danger">דחייה</button></form>
          </div>
        </div>
      )}
      {!isOwner && open && (
        <div className="card-mint grid gap-3 p-5">
          <p className="text-sm">חתמת על ההסכם. ממתין לחתימה של {c.owner?.full_name}. נעדכן אותך בהתראה.</p>
          <form action={cancelCoop}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost">ביטול הבקשה</button></form>
        </div>
      )}

      {signed && (
        <div className="card grid gap-2 p-5">
          <b className="text-green">{isOwner ? 'הפרטים של המתווך של הקונה' : 'הפרטים פתוחים'}</b>
          {!isOwner && <span>כתובת: {priv?.address_full || 'המתווך המפרסם לא הזין כתובת'}</span>}
          {!isOwner && (priv?.seller_name || priv?.seller_phone) && <span>מוכר: {[priv?.seller_name, priv?.seller_phone].filter(Boolean).join(' · ')}</span>}
          <span>{counterpart?.full_name}{counterpart?.office_name ? `, ${counterpart.office_name}` : ''}{counterpart?.phone ? <> · <span dir="ltr" className="num">{counterpart.phone}</span></> : null}</span>
        </div>
      )}

      {(signed || deal) && (
        <div className="card grid gap-3 p-5">
          <b className="text-green">סגירת עסקה</b>
          {!deal && signed && (
            <form action={reportDeal} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={c.id} />
              <label className="field">מחיר העסקה (₪, לא חובה)<input className="input num w-48" name="sale_price" inputMode="numeric" dir="ltr" /></label>
              <button className="btn-primary">דיווח על סגירת עסקה</button>
            </form>
          )}
          {deal?.status === 'reported' && deal.reported_by === profile.id && <p className="text-sm">דיווחת על סגירה{deal.sale_price ? ` ב־${ils(deal.sale_price)}` : ''}. ממתין לאישור של {counterpart?.full_name}.</p>}
          {deal?.status === 'reported' && deal.reported_by !== profile.id && (
            <div className="grid gap-2">
              <p className="text-sm">{counterpart?.full_name} דיווח/ה על סגירת עסקה{deal.sale_price ? ` ב־${ils(deal.sale_price)}` : ''}. זה נכון?</p>
              <div className="flex flex-wrap gap-2">
                <form action={resolveDeal}><input type="hidden" name="id" value={deal.id} /><input type="hidden" name="coop_id" value={c.id} /><input type="hidden" name="confirm" value="yes" /><button className="btn-primary">כן, העסקה נסגרה</button></form>
                <form action={resolveDeal}><input type="hidden" name="id" value={deal.id} /><input type="hidden" name="coop_id" value={c.id} /><input type="hidden" name="confirm" value="no" /><button className="btn-danger">יש מחלוקת</button></form>
              </div>
            </div>
          )}
          {deal?.status === 'verified' && <p className="text-sm font-bold text-good">העסקה אומתה על ידי שני הצדדים ונספרה בפרופיל של שניכם.</p>}
          {deal?.status === 'disputed' && <p className="text-sm text-bad">העסקה סומנה במחלוקת. ניצור קשר עם שני הצדדים לגבי בוררות.</p>}
        </div>
      )}

      <details className="card p-5 text-sm">
        <summary className="cursor-pointer font-bold text-green">{agreement?.title} · גרסה {c.agreement_version}</summary>
        <div className="muted mt-3 whitespace-pre-line leading-relaxed">{String(agreement?.body_md ?? '').replace(/\*\*/g, '')}</div>
      </details>
    </div>
  );
}
