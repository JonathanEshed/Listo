import { requireAgent } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireAgent();
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  return <AppShell profile={profile} unread={count ?? 0}>{children}</AppShell>;
}
