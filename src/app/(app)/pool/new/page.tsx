import { requireAgent } from '@/lib/auth';
import { ListingForm } from '@/components/forms/ListingForm';

export const metadata = { title: 'העלאת נכס' };

export default async function NewListing() {
  const { profile } = await requireAgent();
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <p className="eyebrow">מאגר הקהילה</p>
        <h1 className="h1 mt-1">העלאת נכס למאגר</h1>
        <p className="muted mt-2">הנכס יופיע לכל המתווכים המאומתים, על שמך. כתובת ופרטי המוכר נשארים חסויים עד חתימה.</p>
      </div>
      <ListingForm profile={profile} />
    </div>
  );
}
