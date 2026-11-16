import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { Logo } from '@/components/Logo';
import type { Profile } from '@/lib/types';

export const metadata = { title: 'הצטרפות' };

export default async function Onboarding() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile) redirect('/login');
  if (profile.onboarded_at) redirect('/');
  return (
    <main className="wrap max-w-2xl py-10">
      <Logo />
      <p className="eyebrow mt-8">הצטרפות לקהילה</p>
      <h1 className="h1 mt-2">כמה פרטים, ונאמת את הרישיון</h1>
      <p className="muted mt-3">הקהילה פתוחה רק למתווכים מורשים. אחרי שנאמת את מספר הרישיון מול רשם המתווכים, תקבל/י גישה למאגר וללוח המבוקשים.</p>
      <div className="mt-8"><ProfileForm profile={profile} from="onboarding" /></div>
    </main>
  );
}
