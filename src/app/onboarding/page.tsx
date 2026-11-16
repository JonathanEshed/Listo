import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import type { Profile } from '@/lib/types';

export const metadata = { title: 'הצטרפות' };

export default async function Onboarding() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile) redirect('/login');
  if (profile.onboarded_at) redirect('/');
  return <OnboardingFlow profile={{ ...profile, email: profile.email ?? user.email ?? null }} />;
}
