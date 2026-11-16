import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions';
import { Logo } from '@/components/Logo';
import type { Profile } from '@/lib/types';

export const metadata = { title: 'ממתין לאימות' };

export default async function Pending() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!p?.onboarded_at) redirect('/onboarding');
  if (p.status === 'verified') redirect('/');
  const rejected = p.status === 'rejected' || p.status === 'suspended';
  return (
    <main className="wrap grid min-h-dvh max-w-xl content-center gap-6 py-10">
      <Logo />
      <div className="card-mint p-6">
        <h1 className="font-head text-2xl font-bold">{rejected ? 'לא הצלחנו לאמת את הרישיון' : 'הפרטים התקבלו. בודקים את הרישיון'}</h1>
        <p className="muted mt-3">
          {rejected
            ? 'אם לדעתך זו טעות, כתבו לנו ונבדוק שוב.'
            : `נבדוק את רישיון מספר ${p.license_number} מול רשם המתווכים, בדרך כלל תוך יום עבודה. ברגע שהוא מאומת, תקבל/י גישה מלאה.`}
        </p>
      </div>
      <form action={signOut}><button className="btn-ghost">יציאה</button></form>
    </main>
  );
}
