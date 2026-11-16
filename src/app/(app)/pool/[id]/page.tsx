import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAgent } from '@/lib/auth';
import { setListingStatus } from '@/app/actions';
import { CoopForm } from '@/components/forms/CoopForm';
import { ils, splitLabel, COOP_STATUS, date } from '@/lib/format';
import type { Coop, Listing } from '@/lib/types';

export default async function ListingPage({ params, searchParams }: { params: { id: string }; searchParams: { new?: string } }) {
  const { supabase, profile } = await requireAgent();
  const { data: l } = await supabase
    .from('listings')
    .select('*, agent:profiles!listings_agent_id_fkey(id, full_name, office_name, phone)')
    .eq('id', params.id)
    .single<Listing>();
  if (!l) notFound();
  const mine = l.agent_id === profile.id;
  const [{ data: priv }, { data: coops }, { data: matches }, { data: agreement }, { data: stats }] = await Promise.all([
    supabase.from('listing_private').select('*').eq('listing_id', l.id).maybeSingle(),
    supabase.from('coops').select('*').eq('listing_id', l.id).order('created_at', { ascending: false }),
    supabase.from('matches').select('request_id').eq('listing_id', l.id),
    supabase.from('agreement_versions').select('body_md').order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('agent_stats').select('verified_deals').eq('agent_id', l.agent_id).maybeSingle(),
  ]);
  const myCoop = (coops as Coop[] | null)?.find((c) => c.requester_id === profile.id && !['declined', 'cancelled', 'expired'].includes(c.status));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid gap-5">
        {searchParams.new && <p className="rounded-xl bg-mint p-3 text-sm font-semibold text-green">הנכס עלה למאגר. מתווכים עם קונה מתאים יקבלו התראה.</p>}
        <div className="grid gap-2">
          <p className="eyebrow">{l.city}{l.area ? ` · ${l.area}` : ''}</p>
          <h1 className="h1">{l.title}</h1>
          <p className="font-head text-3xl font-bold num">{ils(l.price)}</p>
        </div>
        {l.photo_urls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {l.photo_urls.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt={`תמונה ${i + 1}`} className={`aspect-[4/3] w-full rounded-xl object-cover ${i === 0 ? 'col-span-2 sm:col-span-3 sm:aspect-[16/9]' : ''}`} />
            ))}
          </div>
        )}
        <dl className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {[['חדרים', l.rooms], ['מ״ר', l.sqm ?? '—'], ['קומה', l.floor ?? '—'], ['פורסם', date(l.created_at)]].map(([k, v]) => (
            <div key={String(k)}><dt className="muted text-xs">{k}</dt><dd className="font-head text-lg font-semibold num">{v}</dd></div>
          ))}
        </dl>
        {l.description && <p className="whitespace-pre-line leading-relaxed">{l.description}</p>}
        {l.video_url && <a href={l.video_url} target="_blank" rel="noopener" className="btn-ghost justify-self-start">צפייה בסרטון ההשקה</a>}
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-24">
        <div className="card grid gap-2 p-5">
          <span className="muted text-xs">המתווך המפרסם</span>
          <b className="font-head text-lg">{l.agent?.full_name}</b>
          <span className="muted text-sm">{l.agent?.office_name} · {stats?.verified_deals ?? 0} עסקאות מאומתות</span>
          <span className="justify-self-start rounded-full bg-mint px-2.5 py-0.5 text-sm font-bold text-green">הצעת חלוקה: {splitLabel(l.offer_kind, l.offer_pct)}</span>
          {l.has_signed_order && <span className="text-sm text-good">✓ הזמנת תיווך חתומה מהמוכר</span>}
        </div>

        {mine ? (
          <>
            <div className="card-mint grid gap-2 p-5">
              <b className="text-green">{matches?.length ?? 0} קונים בלוח מתאימים לנכס</b>
              <Link href="/requests?fit=mine" className="text-sm font-semibold text-green underline">ללוח המבוקשים</Link>
            </div>
            <div className="card grid gap-2 p-5 text-sm">
              <b>פרטים חסויים</b>
              <span>{priv?.address_full || 'לא הוזנה כתובת'}</span>
              <span>{[priv?.seller_name, priv?.seller_phone].filter(Boolean).join(' · ') || 'לא הוזנו פרטי מוכר'}</span>
            </div>
            <form action={setListingStatus} className="card grid gap-3 p-5">
              <input type="hidden" name="id" value={l.id} />
              <label className="field">סטטוס
                <select name="status" defaultValue={l.status} className="input">
                  <option value="active">פעיל במאגר</option><option value="under_contract">בחוזה</option><option value="sold">נמכר</option><option value="withdrawn">הוסר</option>
                </select>
              </label>
              <button className="btn-ghost">עדכון</button>
            </form>
            {coops && coops.length > 0 && (
              <div className="card grid gap-2 p-5">
                <b className="text-sm">בקשות שיתוף פעולה</b>
                {(coops as Coop[]).map((c) => (
                  <Link key={c.id} href={`/coops/${c.id}`} className="flex justify-between gap-2 text-sm hover:underline">
                    <span>{c.ref_code} · {c.buyer_label}</span><span className="muted">{COOP_STATUS[c.status]}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : myCoop ? (
          <Link href={`/coops/${myCoop.id}`} className="card-mint grid gap-1 p-5">
            <b className="text-green">כבר ביקשת שיתוף פעולה על הנכס · {myCoop.ref_code}</b>
            <span className="text-sm">{COOP_STATUS[myCoop.status]}</span>
          </Link>
        ) : l.status === 'active' ? (
          <div className="card p-5">
            <h2 className="mb-4 font-head text-lg font-bold text-green">בקשת שיתוף פעולה</h2>
            <CoopForm listingId={l.id} price={l.price} offerKind={l.offer_kind} offerPct={l.offer_pct} agreement={agreement?.body_md ?? ''} />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
