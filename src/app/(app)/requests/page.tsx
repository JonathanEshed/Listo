import Link from 'next/link';
import { requireAgent } from '@/lib/auth';
import { RequestCard } from '@/components/Cards';
import { RequestForm } from '@/components/forms/RequestForm';
import { closeRequest } from '@/app/actions';
import type { BuyerRequest } from '@/lib/types';

export const metadata = { title: 'לוח מבוקשים' };

export default async function Requests({ searchParams }: { searchParams: { fit?: string } }) {
  const { supabase, profile } = await requireAgent();
  const [{ data: reqs }, { data: matches }] = await Promise.all([
    supabase
      .from('buyer_requests')
      .select('*, agent:profiles!buyer_requests_agent_id_fkey(id, full_name, office_name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('matches').select('listing_id, request_id, listing_agent_id'),
  ]);
  const all = (reqs ?? []) as BuyerRequest[];
  const mine = all.filter((r) => r.agent_id === profile.id);
  const fitsMyListings = new Set((matches ?? []).filter((m) => m.listing_agent_id === profile.id).map((m) => m.request_id));
  let others = all.filter((r) => r.agent_id !== profile.id);
  if (searchParams.fit === 'mine') others = others.filter((r) => fitsMyListings.has(r.id));
  const count = (id: string) => (matches ?? []).filter((m) => m.request_id === id).length;

  return (
    <div className="grid gap-6">
      <div>
        <p className="eyebrow">לוח המבוקשים</p>
        <h1 className="h1 mt-1">קונים שמחפשים נכס</h1>
        <p className="muted mt-2 max-w-2xl">מתווכים מפרסמים כאן את הקונים שלהם, בלי פרטים מזהים. יש לך נכס שמתאים? פנה/י למתווך דרך הנכס במאגר.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
        <RequestForm city={profile.city} />
        <div className="grid gap-6">
          {mine.length > 0 && (
            <section className="grid gap-3">
              <h2 className="font-head text-lg font-bold text-green">הקונים שלי</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {mine.map((r) => (
                  <RequestCard key={r.id} r={r} mine matches={count(r.id)}>
                    <div className="flex flex-wrap gap-2">
                      {count(r.id) > 0 && <Link href="/pool?fit=mine" className="btn-primary px-4 py-2 text-sm">הצגת נכסים מתאימים</Link>}
                      <form action={closeRequest}><input type="hidden" name="id" value={r.id} /><button className="btn-ghost px-4 py-2 text-sm">הקונה מצא נכס</button></form>
                    </div>
                  </RequestCard>
                ))}
              </div>
            </section>
          )}
          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-head text-lg font-bold text-green">קונים של מתווכים אחרים</h2>
              <div className="flex gap-1 rounded-full bg-mint p-1 text-sm font-semibold">
                <Link href="/requests" className={`rounded-full px-3 py-1 ${searchParams.fit ? 'text-green' : 'bg-green text-cream'}`}>כולם</Link>
                <Link href="/requests?fit=mine" className={`rounded-full px-3 py-1 ${searchParams.fit ? 'bg-green text-cream' : 'text-green'}`}>מתאימים לנכסים שלי</Link>
              </div>
            </div>
            {others.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {others.map((r) => (
                  <RequestCard key={r.id} r={r}>
                    {fitsMyListings.has(r.id) && <p className="text-sm font-bold text-good">מתאים לנכס שלך. המתווך קיבל התראה על הנכס.</p>}
                  </RequestCard>
                ))}
              </div>
            ) : (
              <p className="card-mint p-6 text-center text-sm text-muted">אין כרגע קונים בלוח שמתאימים לסינון.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
