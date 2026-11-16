import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from './types';

/** Returns the signed-in agent's profile, or redirects to the right step (login / onboarding / pending). */
export async function requireAgent(opts: { verified?: boolean } = { verified: true }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  if (!profile) redirect('/login');
  if (!profile.onboarded_at) redirect('/onboarding');
  if (opts.verified !== false && profile.status !== 'verified' && !profile.is_admin) redirect('/pending');
  return { supabase, user, profile };
}
