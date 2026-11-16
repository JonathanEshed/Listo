'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { dbError } from '@/lib/format';

export type ActionState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const num = (f: FormData, k: string) => {
  const v = str(f, k).replace(/[^\d.]/g, '');
  return v ? Number(v) : null;
};

async function uid() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  return { supabase, id: data.user.id };
}

// ───────── profile
export async function saveProfile(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase, id } = await uid();
  const full_name = str(f, 'full_name');
  const license_number = str(f, 'license_number');
  if (full_name.length < 2) return { error: 'כתבו שם מלא.' };
  if (!/^\d{3,10}$/.test(license_number)) return { error: 'מספר רישיון התיווך צריך להיות ספרות בלבד.' };
  const offer_kind = str(f, 'offer_kind') || null;
  const offer_pct = offer_kind === 'pct' ? num(f, 'offer_pct') : null;
  if (offer_kind === 'pct' && (!offer_pct || offer_pct < 1 || offer_pct > 99)) return { error: 'החלוקה צריכה להיות אחוז בין 1 ל־99.' };
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      license_number,
      phone: str(f, 'phone') || null,
      office_name: str(f, 'office_name') || null,
      office_kind: str(f, 'office_kind') || 'independent',
      city: str(f, 'city') || null,
      offer_kind,
      offer_pct,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: dbError(error.message) };
  revalidatePath('/', 'layout');
  if (f.get('from') === 'onboarding') redirect('/');
  return { ok: 'הפרופיל נשמר.' };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ───────── listings
export async function createListing(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase, id } = await uid();
  const title = str(f, 'title'), city = str(f, 'city');
  const rooms = num(f, 'rooms'), price = num(f, 'price');
  const offer_kind = str(f, 'offer_kind');
  const offer_pct = offer_kind === 'pct' ? num(f, 'offer_pct') : null;
  if (title.length < 3) return { error: 'כתבו כותרת לנכס, לדוגמה ״4 חדרים עם מרפסת״.' };
  if (!city) return { error: 'באיזו עיר הנכס?' };
  if (!rooms || rooms <= 0) return { error: 'כמה חדרים?' };
  if (!price || price < 10000) return { error: 'כתבו מחיר מבוקש בשקלים.' };
  if (offer_kind !== 'pct' && offer_kind !== 'each') return { error: 'בחרו את הצעת החלוקה שלכם.' };
  if (offer_kind === 'pct' && (!offer_pct || offer_pct < 1 || offer_pct > 99)) return { error: 'החלוקה צריכה להיות אחוז בין 1 ל־99.' };
  if (f.get('has_signed_order') !== 'on') return { error: 'אפשר להעלות למאגר רק נכס עם הזמנת תיווך חתומה מהמוכר.' };

  const photos = f.getAll('photos').filter((p): p is File => p instanceof File && p.size > 0).slice(0, 8);
  const photo_urls: string[] = [];
  for (const p of photos) {
    if (p.size > 8 * 1024 * 1024) return { error: 'כל תמונה עד 8MB.' };
    const ext = (p.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from('listing-media').upload(path, p, { contentType: p.type, upsert: false });
    if (up.error) return { error: 'העלאת התמונות נכשלה. נסו תמונות קטנות יותר.' };
    photo_urls.push(supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl);
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      agent_id: id, title, city, rooms, price, offer_kind, offer_pct,
      area: str(f, 'area') || null,
      sqm: num(f, 'sqm'),
      floor: num(f, 'floor'),
      description: str(f, 'description') || null,
      video_url: str(f, 'video_url') || null,
      has_signed_order: true,
      photo_urls,
    })
    .select('id')
    .single();
  if (error) return { error: dbError(error.message) };
  const priv = { address_full: str(f, 'address_full') || null, seller_name: str(f, 'seller_name') || null, seller_phone: str(f, 'seller_phone') || null };
  if (priv.address_full || priv.seller_name || priv.seller_phone) {
    await supabase.from('listing_private').insert({ listing_id: data.id, ...priv });
  }
  revalidatePath('/pool');
  redirect(`/pool/${data.id}?new=1`);
}

export async function setListingStatus(f: FormData) {
  const { supabase } = await uid();
  const id = str(f, 'id');
  await supabase.from('listings').update({ status: str(f, 'status') }).eq('id', id);
  revalidatePath(`/pool/${id}`);
  revalidatePath('/pool');
}

// ───────── buyer requests
export async function createRequest(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase, id } = await uid();
  const cities = str(f, 'cities').split(/[,،]/).map((c) => c.trim()).filter(Boolean).slice(0, 10);
  const min_rooms = num(f, 'min_rooms') ?? 1;
  const max_price = num(f, 'max_price');
  if (!cities.length) return { error: 'כתבו לפחות עיר אחת.' };
  if (!max_price || max_price < 100000) return { error: 'כתבו תקציב מקסימלי בשקלים.' };
  const note = str(f, 'note');
  if (/\d{9,}|05\d-?\d{7}/.test(note)) return { error: 'בלי טלפון או פרטים מזהים של הקונה בהערה.' };
  const { error } = await supabase.from('buyer_requests').insert({
    agent_id: id, cities, min_rooms, max_price,
    mortgage_approved: f.get('mortgage_approved') === 'on',
    note: note || null,
  });
  if (error) return { error: dbError(error.message) };
  revalidatePath('/requests');
  return { ok: 'הקונה פורסם בלוח. נתריע על כל נכס מתאים.' };
}

export async function closeRequest(f: FormData) {
  const { supabase } = await uid();
  await supabase.from('buyer_requests').update({ status: 'closed' }).eq('id', str(f, 'id'));
  revalidatePath('/requests');
}

// ───────── co-ops
export async function requestCoop(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await uid();
  const listing = str(f, 'listing_id');
  const buyer = str(f, 'buyer_label');
  if (buyer.length < 2) return { error: 'כתבו את שם הקונה, כדי שההפניה תירשם על שמו.' };
  if (f.get('order') !== 'on') return { error: 'צריך הזמנת שירותי תיווך חתומה מהקונה.' };
  if (f.get('agree') !== 'on') return { error: 'סמנו שקראתם את ההסכם כדי לחתום.' };
  const accept = str(f, 'choice') !== 'counter';
  const counter = accept ? null : num(f, 'counter_pct');
  const { data, error } = await supabase
    .rpc('request_coop', { p_listing: listing, p_buyer_label: buyer, p_order_confirmed: true, p_accept_offer: accept, p_counter_pct: counter })
    .single<{ id: string }>();
  if (error) return { error: dbError(error.message) };
  revalidatePath('/coops');
  redirect(`/coops/${data.id}`);
}

export async function respondCoop(f: FormData) {
  const { supabase } = await uid();
  const id = str(f, 'id');
  const { error } = await supabase.rpc('respond_coop', { p_coop: id, p_accept: str(f, 'accept') === 'yes' });
  revalidatePath(`/coops/${id}`);
  revalidatePath('/coops');
  if (error) redirect(`/coops/${id}?e=${encodeURIComponent(dbError(error.message))}`);
}

export async function cancelCoop(f: FormData) {
  const { supabase } = await uid();
  const id = str(f, 'id');
  await supabase.rpc('cancel_coop', { p_coop: id });
  revalidatePath(`/coops/${id}`);
}

export async function reportDeal(f: FormData) {
  const { supabase } = await uid();
  const id = str(f, 'id');
  const { error } = await supabase.rpc('report_deal', { p_coop: id, p_sale_price: num(f, 'sale_price') });
  revalidatePath(`/coops/${id}`);
  if (error) redirect(`/coops/${id}?e=${encodeURIComponent(dbError(error.message))}`);
}

export async function resolveDeal(f: FormData) {
  const { supabase } = await uid();
  const coop = str(f, 'coop_id');
  const { error } = await supabase.rpc('resolve_deal', { p_deal: str(f, 'id'), p_confirm: str(f, 'confirm') === 'yes' });
  revalidatePath(`/coops/${coop}`);
  if (error) redirect(`/coops/${coop}?e=${encodeURIComponent(dbError(error.message))}`);
}

// ───────── notifications & admin
export async function markAllRead() {
  const { supabase, id } = await uid();
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', id).is('read_at', null);
  revalidatePath('/', 'layout');
}

export async function adminSetStatus(f: FormData) {
  const { supabase } = await uid();
  await supabase.rpc('admin_set_status', { p_profile: str(f, 'id'), p_status: str(f, 'status') });
  revalidatePath('/admin');
}
