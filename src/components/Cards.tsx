import Link from 'next/link';
import { ils, millions, splitLabel } from '@/lib/format';
import type { BuyerRequest, Listing } from '@/lib/types';

export function ListingCard({ l, mine, buyers }: { l: Listing; mine?: boolean; buyers?: number }) {
  const cover = l.photo_urls?.[0];
  return (
    <Link href={`/pool/${l.id}`} className={`group block overflow-hidden rounded-card border bg-white transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg ${mine ? 'border-2 border-green' : 'border-green'}`}>
      <div className="relative aspect-[4/3] bg-mint">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">אין תמונה</div>
        )}
        <div className="absolute right-2.5 top-2.5 flex gap-1.5">
          {mine && <span className="pill bg-green text-cream">הנכס שלך</span>}
          {l.has_signed_order && <span className="pill bg-white/90 text-ink">הזמנה חתומה</span>}
          {l.video_url && <span className="pill bg-white/90 text-ink">סרטון</span>}
        </div>
      </div>
      <div className="grid gap-1 p-4">
        <b className="font-head text-lg font-semibold">{l.title}</b>
        <span className="muted text-sm">{[l.city, l.area, `${l.rooms} חד׳`, l.sqm ? `${l.sqm} מ״ר` : null].filter(Boolean).join(' · ')}</span>
        <span className="font-head text-2xl font-bold num">{ils(l.price)}</span>
        <span className="justify-self-start rounded-full bg-mint px-2.5 py-0.5 text-xs font-bold text-green">הצעת חלוקה: {splitLabel(l.offer_kind, l.offer_pct)}</span>
        {buyers != null && buyers > 0 && <span className="text-sm font-bold text-good">{buyers} קונים בלוח מתאימים לנכס</span>}
        {l.agent && !mine && <span className="muted mt-1 text-sm">{l.agent.full_name}{l.agent.office_name ? ` · ${l.agent.office_name}` : ''}</span>}
      </div>
    </Link>
  );
}

export function RequestCard({ r, mine, matches, children }: { r: BuyerRequest; mine?: boolean; matches?: number; children?: React.ReactNode }) {
  return (
    <div className={`grid content-start gap-2 rounded-card bg-white p-4 ${mine ? 'border-2 border-green' : 'border border-green'}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`pill ${r.mortgage_approved ? 'bg-mint text-green' : 'bg-cream text-muted'}`}>{r.mortgage_approved ? 'אישור עקרוני למשכנתא' : 'בלי אישור משכנתא'}</span>
        {mine && <span className="pill bg-green text-cream">הקונה שלך</span>}
      </div>
      <b className="font-head text-lg font-semibold">קונה ל־{r.min_rooms}+ חדרים · {r.cities.join(', ')}</b>
      <span className="font-head text-2xl font-bold num">עד {millions(r.max_price)}</span>
      {r.note && <p className="muted text-sm">{r.note}</p>}
      {matches != null && <p className={`text-sm font-bold ${matches ? 'text-good' : 'text-muted'}`}>{matches ? `${matches} נכסים במאגר מתאימים` : 'אין עדיין נכס מתאים במאגר'}</p>}
      {r.agent && !mine && <span className="muted text-sm">{r.agent.full_name}{r.agent.office_name ? ` · ${r.agent.office_name}` : ''}</span>}
      {children}
    </div>
  );
}
