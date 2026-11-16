import Link from 'next/link';
import { requireAgent } from '@/lib/auth';
import { COOP_STATUS, dateTime, splitLabel } from '@/lib/format';
import type { Coop } from '@/lib/types';

export const metadata = { title: 'שיתופי הפעולה שלי' };

type Row = Coop & { listing: { title: string; city: string } | null; owner: { full_name: string } | null; requester: { full_name: string } | null; deal: { status: string }[] | null };

export default async function Coops() {
  const { supabase, profile } = await requireAgent();
  const { data } = await supabase
    .from('coops')
    .select('*, listing:listings(title, city), owner:profiles!coops_owner_id_fkey(full_name), requester:profiles!coops_requester_id_fkey(full_name), deal:deals(status)')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as Row[];
  const waiting = rows.filter((c) => c.owner_id === profile.id && ['pending', 'countered'].includes(c.status));
  const rest = rows.filter((c) => !waiting.includes(c));

  const Item = ({ c }: { c: Row }) => {
    const incoming = c.owner_id === profile.id;
    const other = incoming ? c.requester?.full_name : c.owner?.full_name;
    const deal = c.deal?.[0]?.status;
    return (
      <li>
        <Link href={`/coops/${c.id}`} className="grid gap-1 px-5 py-4 transition hover:bg-mint sm:grid-cols-[1fr_auto] sm:items-center">
          <span className="grid gap-0.5">
            <b>{incoming ? `${other} רוצה להביא קונה לנכס שלך` : `${c.listing?.title} · ${c.listing?.city} · מול ${other}`}</b>
            <span className="muted text-sm">קונה: {c.buyer_label} · {splitLabel(c.final_kind, c.final_pct)} · <span className="num" dir="ltr">{c.ref_code}</span> · <span className="num">{dateTime(c.created_at)}</span></span>
          </span>
          <span className={`pill justify-self-start ${deal === 'verified' ? 'bg-good text-white' : c.status === 'signed' ? 'bg-mint text-green' : ['pending', 'countered'].includes(c.status) ? 'bg-cream text-ochre' : 'bg-line text-muted'}`}>
            {deal === 'verified' ? 'עסקה מאומתת' : deal === 'reported' ? 'דווחה עסקה' : deal === 'disputed' ? 'בבוררות' : COOP_STATUS[c.status]}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="grid gap-6">
      <div>
        <p className="eyebrow">הקהילה</p>
        <h1 className="h1 mt-1">שיתופי הפעולה שלי</h1>
        <p className="muted mt-2">כל הפניה נרשמת עם תאריך ושעה. עסקה שנסגרת ומאושרת על ידי שני הצדדים נספרת בפרופיל.</p>
      </div>
      {waiting.length > 0 && (
        <section className="card overflow-hidden">
          <h2 className="border-b border-line bg-mint px-5 py-3 font-head font-bold text-green">מחכים לתשובה שלך ({waiting.length})</h2>
          <ul className="divide-y divide-line">{waiting.map((c) => <Item key={c.id} c={c} />)}</ul>
        </section>
      )}
      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 font-head font-bold text-green">כל שיתופי הפעולה</h2>
        {rest.length ? <ul className="divide-y divide-line">{rest.map((c) => <Item key={c.id} c={c} />)}</ul> : (
          <p className="muted px-5 py-8 text-center text-sm">עוד אין שיתופי פעולה. מצאו נכס מתאים לקונה שלכם במאגר, ובקשו שיתוף פעולה מדף הנכס.</p>
        )}
      </section>
    </div>
  );
}
