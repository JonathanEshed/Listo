// A tiny stand-in for the Supabase API with example data, for viewing the screens locally without a real project.
// Usage: node scripts/mock-supabase.mjs  (port 54321), then run the app with
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock
// and open /dev-login in the browser to get a session cookie. Example data only.
import http from 'node:http';

const ME = '00000000-0000-0000-0000-00000000000a';
const now = Date.now();
const ago = (h) => new Date(now - h * 3600e3).toISOString();
const agent = (id, full_name, office_name, extra = {}) => ({ id, email: `${id.slice(-1)}@example.com`, full_name, phone: '050-0000000', office_name, office_kind: 'independent', license_number: '1234' + id.slice(-1), city: 'רמת גן', status: 'verified', is_admin: false, is_founder: false, offer_kind: 'pct', offer_pct: 50, onboarded_at: ago(200), created_at: ago(300), ...extra });
const profiles = [
  agent(ME, 'נועה לוי', 'לוי נכסים', {
    is_admin: true, is_founder: true,
    // MOCK_ME=new → onboarding screen; MOCK_ME=pending → waiting-for-verification screen
    ...(process.env.MOCK_ME === 'new' ? { full_name: '', phone: null, license_number: null, office_name: null, city: null, offer_kind: null, offer_pct: null, onboarded_at: null, status: 'pending', is_admin: false } : {}),
    ...(process.env.MOCK_ME === 'pending' ? { status: 'pending', is_admin: false } : {}),
  }),
  agent('00000000-0000-0000-0000-00000000000b', 'אבי כהן (דוגמה)', 'כהן נכסים'),
  agent('00000000-0000-0000-0000-00000000000c', 'מיכל ברק (דוגמה)', 'עצמאית'),
  agent('00000000-0000-0000-0000-00000000000d', 'דני פרץ (דוגמה)', 'פרץ ושות׳', { status: 'pending', created_at: ago(5) }),
];
const P = (id) => profiles.find((p) => p.id === id);
const photo = (seed) => `https://picsum.photos/seed/${seed}/800/600`;
const listings = [
  { id: 'l1', agent_id: ME, title: '5 חדרים עם מרפסת שמש', city: 'גבעתיים', area: 'בורוכוב', rooms: 5, sqm: 128, floor: 6, price: 3950000, description: 'דירה מוארת, משופצת, חניה ומחסן.', photo_urls: [], video_url: 'https://example.com', has_signed_order: true, offer_kind: 'pct', offer_pct: 50, status: 'active', created_at: ago(30) },
  { id: 'l2', agent_id: profiles[1].id, title: '4 חדרים עם מרפסת', city: 'רמת גן', area: 'הבורסה', rooms: 4, sqm: 98, floor: 3, price: 2890000, description: null, photo_urls: [], video_url: null, has_signed_order: true, offer_kind: 'pct', offer_pct: 60, status: 'active', created_at: ago(10) },
  { id: 'l3', agent_id: profiles[2].id, title: 'דירת גן', city: 'גבעתיים', area: 'שינקין', rooms: 4, sqm: 115, floor: 0, price: 3600000, description: null, photo_urls: [], video_url: null, has_signed_order: true, offer_kind: 'each', offer_pct: null, status: 'active', created_at: ago(50) },
].map((l) => ({ ...l, agent: P(l.agent_id) }));
const buyer_requests = [
  { id: 'r1', agent_id: profiles[1].id, cities: ['גבעתיים', 'רמת גן'], min_rooms: 5, max_price: 4100000, mortgage_approved: true, note: 'משפחה עם 3 ילדים, חייבת מעלית', status: 'active', created_at: ago(20) },
  { id: 'r2', agent_id: ME, cities: ['רמת גן'], min_rooms: 4, max_price: 3000000, mortgage_approved: true, note: null, status: 'active', created_at: ago(40) },
  { id: 'r3', agent_id: profiles[2].id, cities: ['תל אביב'], min_rooms: 3, max_price: 3500000, mortgage_approved: false, note: 'עד 15 דקות הליכה מהים', status: 'active', created_at: ago(60) },
].map((r) => ({ ...r, agent: P(r.agent_id) }));
const matches = [
  { listing_id: 'l1', listing_agent_id: ME, request_id: 'r1', request_agent_id: profiles[1].id },
  { listing_id: 'l2', listing_agent_id: profiles[1].id, request_id: 'r2', request_agent_id: ME },
];
const coops = [
  { id: 'c1', ref_code: 'REF-0007', listing_id: 'l1', owner_id: ME, requester_id: profiles[1].id, buyer_label: 'משפחת גולן', buyer_order_confirmed: true, offered_kind: 'pct', offered_pct: 50, final_kind: 'pct', final_pct: 45, agreement_version: '1.0', status: 'countered', requester_signed_at: ago(3), owner_signed_at: null, expires_at: null, created_at: ago(3) },
  { id: 'c2', ref_code: 'REF-0006', listing_id: 'l3', owner_id: profiles[2].id, requester_id: ME, buyer_label: 'משפחת לוי', buyer_order_confirmed: true, offered_kind: 'each', offered_pct: null, final_kind: 'each', final_pct: null, agreement_version: '1.0', status: 'signed', requester_signed_at: ago(90), owner_signed_at: ago(88), expires_at: new Date(now + 110 * 864e5).toISOString(), created_at: ago(90) },
].map((c) => ({ ...c, listing: listings.find((l) => l.id === c.listing_id), owner: P(c.owner_id), requester: P(c.requester_id), deal: [] }));
const deals = [{ id: 'd1', coop_id: 'c2', reported_by: profiles[2].id, sale_price: 3550000, status: 'reported', reported_at: ago(2) }];
coops[1].deal = [{ status: 'reported' }];
const notifications = [
  { id: 'n1', kind: 'coop_request', title: 'בקשת שיתוף פעולה עם הצעה נגדית', body: '5 חדרים עם מרפסת שמש · REF-0007', link: '/coops/c1', read_at: null, created_at: ago(3) },
  { id: 'n2', kind: 'deal_reported', title: 'דווחה סגירת עסקה. נא לאשר', body: 'REF-0006', link: '/coops/c2', read_at: null, created_at: ago(2) },
  { id: 'n3', kind: 'match_buyers', title: 'מתווך אחד מחזיק קונה שמתאים לנכס שלך', body: '5 חדרים עם מרפסת שמש · גבעתיים', link: '/requests?fit=mine', read_at: ago(1), created_at: ago(29) },
];
const tables = {
  profiles, listings, buyer_requests, matches, coops, deals, notifications,
  listing_private: [{ listing_id: 'l3', address_full: 'שינקין 14, גבעתיים (דוגמה)', seller_name: 'משפחת כהן', seller_phone: '050-0000000' }, { listing_id: 'l1', address_full: 'כצנלסון 40, גבעתיים (דוגמה)', seller_name: 'משפחת אזולאי', seller_phone: '050-0000000' }],
  agreement_versions: [{ version: '1.0', title: 'הסכם שיתוף פעולה סטנדרטי · Listo', body_md: '**טיוטה לדוגמה.**\n1. חלוקת העמלה כפי שסוכם.\n2. איסור עקיפה ל־12 חודשים.\n3. ההפניה בתוקף 120 יום.', valid_days: 120, created_at: ago(500) }],
  agent_stats: profiles.map((p) => ({ agent_id: p.id, verified_deals: p.id === ME ? 3 : 1, disputes: 0 })),
};
const user = { id: ME, aud: 'authenticated', role: 'authenticated', email: 'noa@example.com', app_metadata: {}, user_metadata: {}, created_at: ago(300) };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (code, body, headers = {}) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...headers }); res.end(body === undefined ? '' : JSON.stringify(body)); };
  if (req.method === 'OPTIONS') return send(204, undefined, { 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });
  if (url.pathname === '/auth/v1/user') return send(200, user);
  if (url.pathname === '/auth/v1/admin/generate_link') return send(200, { ...user, action_link: '', email_otp: '111111', hashed_token: 'x', verification_type: 'magiclink', redirect_to: '' });
  if (url.pathname === '/auth/v1/verify') {
    const now = Math.floor(Date.now() / 1000);
    return send(200, { access_token: 'mock', refresh_token: 'mock', token_type: 'bearer', expires_in: 31536000, expires_at: now + 31536000, user });
  }
  if (url.pathname.startsWith('/auth/v1/')) return send(200, {});
  const m = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([a-z_]+)/);
  if (!m) return send(404, { message: 'not found' });
  if (m[1]) return send(200, { id: 'c1' });
  let rows = tables[m[2]] ?? [];
  for (const [k, v] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset', 'or'].includes(k)) continue;
    const [op, ...rest] = v.split('.'); const val = rest.join('.');
    if (op === 'eq') rows = rows.filter((r) => String(r[k]) === val);
    if (op === 'in') { const set = val.replace(/[()]/g, '').split(','); rows = rows.filter((r) => set.includes(String(r[k]))); }
    if (op === 'is' && val === 'null') rows = rows.filter((r) => r[k] == null);
    if (op === 'gte') rows = rows.filter((r) => Number(r[k]) >= Number(val));
    if (op === 'lte') rows = rows.filter((r) => Number(r[k]) <= Number(val));
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(204);
  const range = { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` };
  if (req.method === 'HEAD') return send(200, undefined, range);
  if ((req.headers.accept || '').includes('vnd.pgrst.object')) return rows.length ? send(200, rows[0], range) : send(406, { code: 'PGRST116', message: 'no rows' });
  send(200, rows, range);
}).listen(54321, () => console.log('mock supabase on :54321'));
