import Link from 'next/link';
import { requireAgent } from '@/lib/auth';
import { markAllRead } from '@/app/actions';
import { dateTime } from '@/lib/format';
import type { Notification } from '@/lib/types';

export default async function Home() {
  const { supabase, profile } = await requireAgent();
  const [{ data: notes }, { count: myListings }, { count: myRequests }, { data: matches }, { data: openCoops }] = await Promise.all([
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(12),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('agent_id', profile.id).eq('status', 'active'),
    supabase.from('buyer_requests').select('id', { count: 'exact', head: true }).eq('agent_id', profile.id).eq('status', 'active'),
    supabase.from('matches').select('listing_id, request_id, listing_agent_id, request_agent_id'),
    supabase.from('coops').select('id, status, owner_id').in('status', ['pending', 'countered']),
  ]);
  const forMyBuyers = new Set((matches ?? []).filter((m) => m.request_agent_id === profile.id).map((m) => m.listing_id)).size;
  const forMyListings = new Set((matches ?? []).filter((m) => m.listing_agent_id === profile.id).map((m) => m.request_id)).size;
  const waitingForMe = (openCoops ?? []).filter((c) => c.owner_id === profile.id).length;
  const unread = (notes ?? []).filter((n: Notification) => !n.read_at).length;

  const tiles = [
    { n: forMyBuyers, t: 'נכסים מתאימים לקונים שלך', href: '/pool?fit=mine' },
    { n: forMyListings, t: 'קונים מתאימים לנכסים שלך', href: '/requests?fit=mine' },
    { n: waitingForMe, t: 'בקשות שת״פ שמחכות לך', href: '/coops' },
  ];

  return (
    <div className="grid gap-8">
      <div>
        <p className="eyebrow">שלום {profile.full_name.split(' ')[0]}</p>
        <h1 className="h1 mt-1">מה חדש בקהילה</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map((t) => (
          <Link key={t.t} href={t.href} className="card-mint grid content-start gap-1 p-3 transition hover:bg-[#E6EEE3] sm:p-5">
            <b className="font-head text-3xl font-bold text-green num sm:text-4xl">{t.n}</b>
            <span className="text-xs font-semibold leading-snug sm:text-sm">{t.t}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/pool/new" className="btn-primary">העלאת נכס למאגר</Link>
        <Link href="/requests#new" className="btn-ghost">פרסום קונה בלוח</Link>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-head text-lg font-bold text-green">התראות</h2>
          {unread > 0 && <form action={markAllRead}><button className="text-sm font-semibold text-green">סימון הכל כנקרא</button></form>}
        </div>
        {notes?.length ? (
          <ul className="divide-y divide-line">
            {(notes as Notification[]).map((n) => (
              <li key={n.id}>
                <Link href={n.link ?? '/'} className={`flex items-start gap-3 px-5 py-3.5 transition hover:bg-mint ${n.read_at ? '' : 'bg-[#FBFAF6]'}`}>
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read_at ? 'bg-line' : 'bg-ochre'}`} />
                  <span className="grid gap-0.5">
                    <b className="text-[15px]">{n.title}</b>
                    {n.body && <span className="muted text-sm">{n.body}</span>}
                    <span className="text-xs text-muted num">{dateTime(n.created_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted px-5 py-8 text-center text-sm">אין עדיין התראות. כשיעלה נכס שמתאים לקונה שלך, או קונה שמתאים לנכס שלך, זה יופיע כאן.</p>
        )}
      </section>

      <p className="muted text-sm">יש לך {myListings ?? 0} נכסים פעילים ו־{myRequests ?? 0} קונים בלוח.</p>
    </div>
  );
}
