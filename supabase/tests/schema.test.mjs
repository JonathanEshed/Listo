// Runs the migration on an in-memory Postgres (PGlite) and walks the main co-op flow under RLS.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const throws = async (fn, m) => { try { await fn(); ok(false, m + ' (did not throw)'); } catch (e) { ok(true, m + ' → ' + e.message.split('\n')[0]); } };

await db.exec(fs.readFileSync(path.join(dir, 'stub_auth.sql'), 'utf8'));
await db.exec(fs.readFileSync(path.join(dir, '../migrations/20261116000000_init.sql'), 'utf8'));
console.log('migration applied');

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b',
      C = '00000000-0000-0000-0000-00000000000c', ADM = '00000000-0000-0000-0000-0000000000ad';
for (const [id, e] of [[A, 'a@x.il'], [B, 'b@x.il'], [C, 'c@x.il'], [ADM, 'adm@x.il']])
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, e]);
ok((await db.query('select count(*)::int n from public.profiles')).rows[0].n === 4, 'profiles created by trigger');
await db.query(`update public.profiles set is_admin = true, status='verified' where id = $1`, [ADM]);

async function as(uid, sql, params = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${uid}'; set role authenticated;`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role;'); }
}

// agent A tries to self-verify
await as(A, `update public.profiles set status='verified', full_name='אבי', license_number='123' where id=$1`, [A]);
ok((await db.query('select status from public.profiles where id=$1', [A])).rows[0].status === 'pending', 'agent cannot self-verify');
await throws(() => as(A, `insert into public.listings (agent_id,title,city,rooms,price,offer_kind,offer_pct) values ($1,'4 חדרים','רמת גן',4,2900000,'pct',50)`, [A]), 'unverified agent cannot list');
await throws(() => as(A, `select public.admin_set_status($1,'verified')`, [A]), 'non-admin cannot verify');
for (const u of [A, B, C]) await as(ADM, `select public.admin_set_status($1,'verified')`, [u]);
ok((await as(A, `select count(*)::int n from public.notifications`)).rows[0].n === 1, 'agent notified on verification');

// B posts a buyer request, then A lists a fitting property → both notified
await as(B, `insert into public.buyer_requests (agent_id,cities,min_rooms,max_price,mortgage_approved) values ($1,'{רמת גן,גבעתיים}',4,3000000,true)`, [B]);
const L = (await as(A, `insert into public.listings (agent_id,title,city,rooms,price,offer_kind,offer_pct,has_signed_order) values ($1,'4 חדרים עם מרפסת','רמת גן',4,2890000,'pct',60,true) returning id`, [A])).rows[0].id;
await as(A, `insert into public.listing_private (listing_id,address_full,seller_name,seller_phone) values ($1,'ביאליק 14','משפחת כהן','050-0000000')`, [L]);
ok((await as(B, `select count(*)::int n from public.notifications where kind='match_listing'`)).rows[0].n === 1, 'buyer agent notified of new matching listing');
ok((await as(A, `select count(*)::int n from public.notifications where kind='match_buyers'`)).rows[0].n === 1, 'listing agent told buyers fit');
ok((await as(B, `select count(*)::int n from public.matches`)).rows[0].n === 1, 'match visible');

// privacy before signing
ok((await as(B, `select count(*)::int n from public.listing_private`)).rows[0].n === 0, 'seller details hidden before signing');
ok((await as(C, `select count(*)::int n from public.listings`)).rows[0].n === 1, 'verified agent sees pool');
await throws(() => as(B, `insert into public.coops (listing_id,owner_id,requester_id,buyer_label,buyer_order_confirmed,offered_kind,final_kind,agreement_version) values ($1,$2,$3,'x',true,'each','each','1.0')`, [L, A, B]), 'direct coop insert blocked');

// co-op: needs buyer order; counter offer; owner signs
await throws(() => as(B, `select public.request_coop($1,'משפחת לוי',false,true)`, [L]), 'buyer order required');
await throws(() => as(A, `select public.request_coop($1,'משפחת לוי',true,true)`, [L]), 'cannot co-op own listing');
const coop = (await as(B, `select * from public.request_coop($1,'משפחת לוי',true,false,50::smallint)`, [L])).rows[0];
ok(coop.status === 'countered' && coop.final_pct === 50 && coop.offered_pct === 60, 'counter offer recorded (offered 60, countered 50)');
ok(/^REF-\d{4}$/.test(coop.ref_code), 'ref code ' + coop.ref_code);
ok((await as(C, `select count(*)::int n from public.coops`)).rows[0].n === 0, 'third agent cannot see the co-op');
await throws(() => as(B, `select public.respond_coop($1,true)`, [coop.id]), 'requester cannot sign for owner');
const signed = (await as(A, `select * from public.respond_coop($1,true)`, [coop.id])).rows[0];
ok(signed.status === 'signed' && signed.expires_at, 'owner signed, expiry set');
ok((await as(B, `select seller_name from public.listing_private`)).rows[0]?.seller_name === 'משפחת כהן', 'seller details revealed after both signed');
ok((await as(C, `select count(*)::int n from public.listing_private`)).rows[0].n === 0, 'still hidden from others');

// deal: reported by B, verified by A
const deal = (await as(B, `select * from public.report_deal($1,2850000)`, [coop.id])).rows[0];
await throws(() => as(B, `select public.resolve_deal($1,true)`, [deal.id]), 'reporter cannot verify own report');
await as(A, `select public.resolve_deal($1,true)`, [deal.id]);
const st = (await as(C, `select verified_deals::int v from public.agent_stats where agent_id=$1`, [A])).rows[0];
ok(st?.v === 1, 'verified deal counted on profile');

// profile guard
await as(B, `update public.profiles set is_admin=true where id=$1`, [B]);
ok((await db.query('select is_admin from public.profiles where id=$1', [B])).rows[0].is_admin === false, 'agent cannot make self admin');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
