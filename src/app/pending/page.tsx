import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions';
import { Logo } from '@/components/Logo';
import type { Profile } from '@/lib/types';

export const metadata = { title: 'ממתין לאימות' };

function Dot({ state }: { state: 'done' | 'now' | 'next' | 'bad' }) {
  if (state === 'done')
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-green text-white">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
      </span>
    );
  if (state === 'now')
    return (
      <span className="relative grid h-7 w-7 place-items-center rounded-full bg-ochre-light/30">
        <span className="absolute inset-0 animate-ping rounded-full bg-ochre-light/30 [animation-duration:2s]" />
        <span className="h-2.5 w-2.5 rounded-full bg-ochre" />
      </span>
    );
  if (state === 'bad') return <span className="grid h-7 w-7 place-items-center rounded-full bg-bad/10 text-bad font-bold">!</span>;
  return <span className="h-7 w-7 rounded-full ring-1 ring-inset ring-line" />;
}

export default async function Pending() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!p?.onboarded_at) redirect('/onboarding');
  if (p.status === 'verified') redirect('/');
  const rejected = p.status === 'rejected' || p.status === 'suspended';
  const first = p.full_name.split(' ')[0];

  const steps = [
    { t: 'הפרטים התקבלו', s: new Date(p.onboarded_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' }), st: 'done' as const },
    { t: rejected ? 'לא הצלחנו לאמת את הרישיון' : 'אימות רישיון', s: rejected ? 'אם זו טעות, כתבו לנו ונבדוק שוב.' : `רישיון ${p.license_number} מול רשם המתווכים · בדרך כלל תוך יום עבודה`, st: rejected ? ('bad' as const) : ('now' as const) },
    { t: 'גישה מלאה לקהילה', s: 'מאגר הנכסים, לוח המבוקשים והסכמי שיתוף פעולה', st: 'next' as const },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-10 pt-6 sm:px-8">
      <Logo />
      <div className="rise mt-[10vh]">
        <p className="eyebrow">{rejected ? 'סטטוס הצטרפות' : 'כמעט בפנים'}</p>
        <h1 className="ob-title">{rejected ? `${first}, צריך לבדוק משהו` : `תודה ${first}, אנחנו על זה`}</h1>
        <p className="ob-lead">{rejected ? 'לא הצלחנו לאמת את מספר הרישיון שמסרת.' : 'נשלח לך מייל ברגע שהרישיון מאומת. אין צורך לעשות שום דבר בינתיים.'}</p>

        <ol className="mt-10">
          {steps.map((x, i) => (
            <li key={x.t} className="relative flex gap-4 pb-8 last:pb-0">
              {i < steps.length - 1 && <span className={`absolute right-[13px] top-8 h-[calc(100%-2rem)] w-px ${x.st === 'done' ? 'bg-green' : 'bg-line'}`} aria-hidden="true" />}
              <Dot state={x.st} />
              <div className="min-w-0 pt-0.5">
                <p className={`font-semibold ${x.st === 'next' ? 'text-muted' : 'text-ink'}`}>{x.t}</p>
                <p className="mt-0.5 text-sm text-muted">{x.s}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-line pt-6 text-sm">
        <span className="text-muted" dir="ltr">{p.email}</span>
        <form action={signOut}><button className="font-semibold text-green hover:underline">יציאה</button></form>
      </div>
    </main>
  );
}
