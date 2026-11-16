import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth';
import { adminSetStatus } from '@/app/actions';
import { OFFICE_KIND, dateTime } from '@/lib/format';
import type { Profile } from '@/lib/types';

export const metadata = { title: 'ניהול' };

const STATUS: Record<string, string> = { pending: 'ממתין', verified: 'מאומת', rejected: 'נדחה', suspended: 'מושעה' };

export default async function Admin() {
  const { supabase, profile } = await requireAgent();
  if (!profile.is_admin) redirect('/');
  const [{ data: agents }, { count: listings }, { count: requests }, { count: coops }, { count: signed }, { count: verified }] = await Promise.all([
    supabase.from('profiles').select('*').not('onboarded_at', 'is', null).order('created_at', { ascending: false }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('buyer_requests').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('coops').select('id', { count: 'exact', head: true }),
    supabase.from('coops').select('id', { count: 'exact', head: true }).eq('status', 'signed'),
    supabase.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
  ]);
  const list = (agents ?? []) as Profile[];
  const pending = list.filter((a) => a.status === 'pending');
  const stats = [
    ['מתווכים מאומתים', list.filter((a) => a.status === 'verified').length],
    ['ממתינים לאימות', pending.length],
    ['נכסים פעילים', listings ?? 0],
    ['קונים בלוח', requests ?? 0],
    ['בקשות שת״פ', coops ?? 0],
    ['שת״פ חתומים', signed ?? 0],
    ['עסקאות מאומתות', verified ?? 0],
  ];

  const Row = ({ a }: { a: Profile }) => (
    <tr className="border-t border-line align-top">
      <td className="p-3"><b>{a.full_name}</b><span className="muted block text-xs" dir="ltr">{a.email}</span></td>
      <td className="p-3 num" dir="ltr">{a.license_number}</td>
      <td className="p-3">{OFFICE_KIND[a.office_kind]}{a.office_name ? ` · ${a.office_name}` : ''}<span className="muted block text-xs">{a.city}</span></td>
      <td className="p-3 num" dir="ltr">{a.phone}</td>
      <td className="p-3 text-xs num">{dateTime(a.created_at)}</td>
      <td className="p-3">{STATUS[a.status]}</td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {a.status !== 'verified' && <form action={adminSetStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="verified" /><button className="btn-primary px-3 py-1.5 text-xs">אימות</button></form>}
          {a.status === 'pending' && <form action={adminSetStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="rejected" /><button className="btn-danger px-3 py-1.5 text-xs">דחייה</button></form>}
          {a.status === 'verified' && !a.is_admin && <form action={adminSetStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="suspended" /><button className="btn-ghost px-3 py-1.5 text-xs">השעיה</button></form>}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="grid gap-6">
      <h1 className="h1">ניהול</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([t, n]) => (
          <div key={String(t)} className="card-mint p-4"><b className="font-head text-3xl text-green num">{n}</b><span className="block text-xs font-semibold">{t}</span></div>
        ))}
      </div>
      <p className="muted text-sm">לפני אימות: לבדוק את מספר הרישיון באתר רשם המתווכים במשרד המשפטים.</p>
      {[['ממתינים לאימות', pending], ['כל המתווכים', list.filter((a) => a.status !== 'pending')]].map(([title, rows]) => (
        <section key={String(title)} className="card overflow-hidden">
          <h2 className="border-b border-line bg-mint px-4 py-3 font-head font-bold text-green">{title as string} ({(rows as Profile[]).length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="muted text-xs"><tr><th className="p-3">שם</th><th className="p-3">רישיון</th><th className="p-3">משרד</th><th className="p-3">טלפון</th><th className="p-3">נרשם</th><th className="p-3">סטטוס</th><th className="p-3" /></tr></thead>
              <tbody>{(rows as Profile[]).map((a) => <Row key={a.id} a={a} />)}</tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
