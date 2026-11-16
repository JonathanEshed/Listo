import Link from 'next/link';
import { requireAgent } from '@/lib/auth';
import { ListingCard } from '@/components/Cards';
import type { Listing } from '@/lib/types';

export const metadata = { title: 'מאגר הנכסים' };

type Search = { city?: string; rooms?: string; max?: string; fit?: string; mine?: string };

export default async function Pool({ searchParams }: { searchParams: Search }) {
  const { supabase, profile } = await requireAgent();
  let q = supabase
    .from('listings')
    .select('*, agent:profiles!listings_agent_id_fkey(id, full_name, office_name, phone)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(120);
  if (searchParams.city) q = q.eq('city', searchParams.city);
  if (searchParams.rooms) q = q.gte('rooms', Number(searchParams.rooms));
  if (searchParams.max) q = q.lte('price', Number(searchParams.max));
  if (searchParams.mine) q = q.eq('agent_id', profile.id);

  const [{ data: listings }, { data: matches }, { data: cityRows }] = await Promise.all([
    q,
    supabase.from('matches').select('listing_id, request_agent_id'),
    supabase.from('listings').select('city').eq('status', 'active').limit(1000),
  ]);
  const fitMine = new Set((matches ?? []).filter((m) => m.request_agent_id === profile.id).map((m) => m.listing_id));
  const buyersFor = (id: string) => (matches ?? []).filter((m) => m.listing_id === id).length;
  let rows = (listings ?? []) as Listing[];
  if (searchParams.fit === 'mine') rows = rows.filter((l) => fitMine.has(l.id));
  const cities = Array.from(new Set((cityRows ?? []).map((r) => r.city))).sort((a, b) => a.localeCompare(b, 'he'));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">מאגר הקהילה</p>
          <h1 className="h1 mt-1">נכסים במאגר</h1>
        </div>
        <Link href="/pool/new" className="btn-primary">העלאת נכס</Link>
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto] sm:items-end" role="search">
        <label className="field">עיר
          <select name="city" defaultValue={searchParams.city ?? ''} className="input">
            <option value="">כל הערים</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">חדרים, לפחות
          <select name="rooms" defaultValue={searchParams.rooms ?? ''} className="input">
            <option value="">הכל</option>{[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
        <label className="field">מחיר עד
          <select name="max" defaultValue={searchParams.max ?? ''} className="input">
            <option value="">ללא הגבלה</option>
            {[1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8].map((m) => <option key={m} value={m * 1_000_000}>₪{m} מיליון</option>)}
          </select>
        </label>
        <label className="field">הצג
          <select name="fit" defaultValue={searchParams.fit ?? ''} className="input">
            <option value="">כל הנכסים</option><option value="mine">מתאימים לקונים שלי</option>
          </select>
        </label>
        <button className="btn-ghost">סינון</button>
      </form>

      <p className="muted text-sm num">{rows.length} נכסים</p>
      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((l) => <ListingCard key={l.id} l={l} mine={l.agent_id === profile.id} buyers={l.agent_id === profile.id ? buyersFor(l.id) : undefined} />)}
        </div>
      ) : (
        <div className="card-mint p-8 text-center">
          <p className="font-semibold">אין נכסים שמתאימים לסינון.</p>
          <p className="muted mt-1 text-sm">נסו עיר אחרת או מחיר גבוה יותר. ואם יש לך נכס, תהיו הראשונים להעלות אותו.</p>
        </div>
      )}
    </div>
  );
}
