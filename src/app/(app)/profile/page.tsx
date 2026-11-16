import { requireAgent } from '@/lib/auth';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { signOut } from '@/app/actions';

export const metadata = { title: 'הפרופיל שלי' };

export default async function ProfilePage() {
  const { supabase, profile } = await requireAgent();
  const { data: stats } = await supabase.from('agent_stats').select('verified_deals, disputes').eq('agent_id', profile.id).maybeSingle();
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-green font-head text-2xl text-cream">{(profile.full_name || '?')[0]}</span>
        <div>
          <h1 className="font-head text-2xl font-bold">{profile.full_name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="pill bg-mint text-good">✓ רישיון תיווך מאומת</span>
            {profile.is_founder && <span className="pill bg-cream text-ochre">מייסד/ת</span>}
            {profile.is_admin && <span className="pill bg-green text-cream">מנהל/ת</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card-mint p-4"><b className="font-head text-3xl text-green num">{stats?.verified_deals ?? 0}</b><span className="block text-sm">עסקאות מאומתות</span></div>
        <div className="card-mint p-4"><b className="font-head text-3xl text-green num">{stats?.disputes ?? 0}</b><span className="block text-sm">מחלוקות</span></div>
      </div>
      <section className="card p-5"><ProfileForm profile={profile} from="profile" /></section>
      <form action={signOut}><button className="btn-ghost">יציאה מהחשבון</button></form>
    </div>
  );
}
