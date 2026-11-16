-- Listo · initial schema
-- Co-brokerage community for licensed real-estate agents in Israel.
-- Principles baked into the schema:
--   * Listo never sets a commission split. The listing agent proposes one; the buyer's agent accepts or counters.
--   * Seller details and the full address live in a separate table, readable only by the listing agent
--     and by the counterpart of a co-op agreement that both sides signed.
--   * Only agents an admin has verified (license checked) can see the pool and the buyer board.


-- ───────────────────────── enums
create type agent_status   as enum ('pending', 'verified', 'rejected', 'suspended');
create type office_kind    as enum ('independent', 'office', 'chain');
create type split_kind     as enum ('pct', 'each');          -- pct = listing agent's share of the total; each = each side bills own client
create type listing_status as enum ('active', 'under_contract', 'sold', 'withdrawn');
create type request_status as enum ('active', 'closed');
create type coop_status    as enum ('pending', 'countered', 'signed', 'declined', 'cancelled', 'expired');
create type deal_status    as enum ('reported', 'verified', 'disputed');

-- ───────────────────────── profiles (one per auth user)
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text,
  full_name       text not null default '',
  phone           text,
  office_name     text,
  office_kind     office_kind not null default 'independent',
  license_number  text,
  city            text,
  status          agent_status not null default 'pending',
  is_admin        boolean not null default false,
  is_founder      boolean not null default false,
  -- the split this agent proposes on their own listings (no default: the agent decides)
  offer_kind      split_kind,
  offer_pct       smallint check (offer_pct between 1 and 99),
  onboarded_at    timestamptz,
  verified_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint offer_pct_needed check (offer_kind is distinct from 'pct' or offer_pct is not null)
);

-- ───────────────────────── listings (public part, visible to verified agents)
create table public.listings (
  id                uuid primary key default gen_random_uuid(),
  agent_id          uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(title) between 3 and 120),
  city              text not null,
  area              text,
  rooms             numeric(3,1) not null check (rooms > 0 and rooms < 30),
  sqm               integer check (sqm > 0 and sqm < 5000),
  floor             smallint,
  price             bigint not null check (price > 0),
  description       text,
  photo_urls        text[] not null default '{}',
  video_url         text,
  has_signed_order  boolean not null default false,   -- agent attests a signed brokerage order with the seller
  offer_kind        split_kind not null,
  offer_pct         smallint check (offer_pct between 1 and 99),
  status            listing_status not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint listing_offer_pct_needed check (offer_kind <> 'pct' or offer_pct is not null)
);
create index listings_city_idx   on public.listings (city) where status = 'active';
create index listings_agent_idx  on public.listings (agent_id);

-- ───────────────────────── listing_private (address + seller, revealed only after both sides sign)
create table public.listing_private (
  listing_id    uuid primary key references public.listings (id) on delete cascade,
  address_full  text,
  seller_name   text,
  seller_phone  text
);

-- ───────────────────────── buyer requests (anonymous buyers)
create table public.buyer_requests (
  id                 uuid primary key default gen_random_uuid(),
  agent_id           uuid not null references public.profiles (id) on delete cascade,
  cities             text[] not null check (cardinality(cities) between 1 and 10),
  min_rooms          numeric(3,1) not null default 1,
  max_price          bigint not null check (max_price > 0),
  mortgage_approved  boolean not null default false,
  note               text check (char_length(note) <= 280),
  status             request_status not null default 'active',
  created_at         timestamptz not null default now()
);
create index buyer_requests_agent_idx on public.buyer_requests (agent_id);

-- ───────────────────────── agreement versions (standard co-op agreement text)
create table public.agreement_versions (
  version     text primary key,
  title       text not null,
  body_md     text not null,
  valid_days  smallint not null default 120,
  created_at  timestamptz not null default now()
);

-- ───────────────────────── co-op requests / agreements
create sequence public.coop_ref_seq start 1;
create table public.coops (
  id                    uuid primary key default gen_random_uuid(),
  ref_code              text not null unique default ('REF-' || lpad(nextval('public.coop_ref_seq')::text, 4, '0')),
  listing_id            uuid not null references public.listings (id) on delete cascade,
  owner_id              uuid not null references public.profiles (id),   -- listing agent
  requester_id          uuid not null references public.profiles (id),   -- buyer's agent
  buyer_label           text not null check (char_length(buyer_label) between 2 and 80),
  buyer_order_confirmed boolean not null,                                -- buyer signed a brokerage order with requester
  offered_kind          split_kind not null,                             -- snapshot of the listing's offer
  offered_pct           smallint,
  final_kind            split_kind not null,                             -- what the requester signed
  final_pct             smallint check (final_pct between 1 and 99),
  agreement_version     text not null references public.agreement_versions (version),
  status                coop_status not null default 'pending',
  requester_signed_at   timestamptz,
  owner_signed_at       timestamptz,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  constraint coop_parties_differ check (owner_id <> requester_id),
  constraint coop_final_pct_needed check (final_kind <> 'pct' or final_pct is not null)
);
create index coops_owner_idx     on public.coops (owner_id);
create index coops_requester_idx on public.coops (requester_id);

-- ───────────────────────── deals (reported by one side, verified by the other)
create table public.deals (
  id            uuid primary key default gen_random_uuid(),
  coop_id       uuid not null unique references public.coops (id) on delete cascade,
  reported_by   uuid not null references public.profiles (id),
  sale_price    bigint check (sale_price > 0),
  status        deal_status not null default 'reported',
  reported_at   timestamptz not null default now(),
  resolved_by   uuid references public.profiles (id),
  resolved_at   timestamptz
);

-- ───────────────────────── notifications
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ═════════════════════════ helpers
create or replace function public.is_verified() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'verified');
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin);
$$;

-- a listing and a request match when the city is wanted, rooms suffice and the price is within 3% of the budget
create or replace function public.fits(l public.listings, r public.buyer_requests) returns boolean
language sql immutable as $$
  select l.status = 'active' and r.status = 'active'
     and l.agent_id <> r.agent_id
     and l.city = any (r.cities)
     and l.rooms >= r.min_rooms
     and l.price <= (r.max_price * 1.03)::bigint;
$$;

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link) values (p_user, p_kind, p_title, p_body, p_link);
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

-- ═════════════════════════ views
-- matches between active listings and active buyer requests; RLS of the base tables still applies (security_invoker)
create or replace view public.matches with (security_invoker = true) as
  select l.id as listing_id, l.agent_id as listing_agent_id,
         r.id as request_id, r.agent_id as request_agent_id,
         l.city, l.rooms, l.price, r.max_price, r.min_rooms
    from public.listings l
    join public.buyer_requests r on public.fits(l, r);

-- public trust stats per agent (counts only, no deal details). Runs with the view owner's rights so that
-- every verified agent can see everyone's counts; the where-clause limits it to verified viewers.
create or replace view public.agent_stats as
  select p.id as agent_id,
         (select count(*) from public.deals d join public.coops c on c.id = d.coop_id
            where d.status = 'verified' and (c.owner_id = p.id or c.requester_id = p.id)) as verified_deals,
         (select count(*) from public.deals d join public.coops c on c.id = d.coop_id
            where d.status = 'disputed' and (c.owner_id = p.id or c.requester_id = p.id)) as disputes
    from public.profiles p
   where p.status = 'verified' and (public.is_verified() or public.is_admin());

-- ═════════════════════════ triggers
-- create a profile row for every new auth user
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- profile edits: agents cannot change their own status / admin / founder flags
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the service role / SQL editor, which may change anything
  if auth.uid() is not null and not public.is_admin() then
    new.status      := old.status;
    new.is_admin    := old.is_admin;
    new.is_founder  := old.is_founder;
    new.verified_at := old.verified_at;
  end if;
  if new.status = 'verified' and old.status <> 'verified' then
    new.verified_at := now();
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

-- new listing → tell agents whose buyers fit; tell the listing agent how many buyers fit
create or replace function public.on_listing_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select * from public.buyer_requests br where public.fits(new, br) loop
    n := n + 1;
    perform public.notify(r.agent_id, 'match_listing', 'נכס חדש מתאים לקונה שלך',
      new.title || ' · ' || new.city || ' · ₪' || to_char(new.price, 'FM999,999,999'), '/pool/' || new.id);
  end loop;
  if n > 0 then
    perform public.notify(new.agent_id, 'match_buyers',
      case when n = 1 then 'מתווך אחד מחזיק קונה שמתאים לנכס שלך' else n || ' מתווכים מחזיקים קונה שמתאים לנכס שלך' end,
      new.title || ' · ' || new.city, '/requests?listing=' || new.id);
  end if;
  return new;
end $$;
create trigger listings_after_insert after insert on public.listings
  for each row execute function public.on_listing_created();

-- new buyer request → tell listing agents whose listing fits
create or replace function public.on_request_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare l record;
begin
  for l in select * from public.listings li where public.fits(li, new) loop
    perform public.notify(l.agent_id, 'match_request', 'קונה חדש בלוח מתאים לנכס שלך',
      'עד ₪' || to_char(new.max_price, 'FM999,999,999') || ' · ' || array_to_string(new.cities, ', '), '/requests');
  end loop;
  return new;
end $$;
create trigger buyer_requests_after_insert after insert on public.buyer_requests
  for each row execute function public.on_request_created();

-- ═════════════════════════ RPC: co-op flow (all writes to coops/deals go through these)
-- The buyer's agent asks to cooperate on a listing. Sending = the requester's signature on the standard agreement.
create or replace function public.request_coop(
  p_listing uuid, p_buyer_label text, p_order_confirmed boolean,
  p_accept_offer boolean, p_counter_pct smallint default null
) returns public.coops
language plpgsql security definer set search_path = public as $$
declare l public.listings; c public.coops; v text;
begin
  if not public.is_verified() then raise exception 'not_verified'; end if;
  if not coalesce(p_order_confirmed, false) then raise exception 'buyer_order_required'; end if;
  select * into l from public.listings where id = p_listing and status = 'active';
  if not found then raise exception 'listing_not_available'; end if;
  if l.agent_id = auth.uid() then raise exception 'own_listing'; end if;
  if not p_accept_offer and (p_counter_pct is null or p_counter_pct not between 1 and 99) then
    raise exception 'counter_pct_invalid';
  end if;
  select version into v from public.agreement_versions order by created_at desc limit 1;

  insert into public.coops (listing_id, owner_id, requester_id, buyer_label, buyer_order_confirmed,
                            offered_kind, offered_pct, final_kind, final_pct, agreement_version,
                            status, requester_signed_at)
  values (l.id, l.agent_id, auth.uid(), trim(p_buyer_label), true,
          l.offer_kind, l.offer_pct,
          case when p_accept_offer then l.offer_kind else 'pct'::split_kind end,
          case when p_accept_offer then l.offer_pct else p_counter_pct end,
          v, case when p_accept_offer then 'pending'::coop_status else 'countered'::coop_status end, now())
  returning * into c;

  perform public.notify(l.agent_id, 'coop_request',
    case when p_accept_offer then 'בקשת שיתוף פעולה חדשה' else 'בקשת שיתוף פעולה עם הצעה נגדית' end,
    l.title || ' · ' || c.ref_code, '/coops/' || c.id);
  return c;
end $$;

-- The listing agent signs (accept) or declines.
create or replace function public.respond_coop(p_coop uuid, p_accept boolean) returns public.coops
language plpgsql security definer set search_path = public as $$
declare c public.coops; days smallint;
begin
  select * into c from public.coops where id = p_coop for update;
  if not found or c.owner_id <> auth.uid() then raise exception 'not_found'; end if;
  if c.status not in ('pending', 'countered') then raise exception 'not_open'; end if;
  if p_accept then
    select valid_days into days from public.agreement_versions where version = c.agreement_version;
    update public.coops set status = 'signed', owner_signed_at = now(), expires_at = now() + make_interval(days => days)
      where id = c.id returning * into c;
    perform public.notify(c.requester_id, 'coop_signed', 'שיתוף הפעולה נחתם. הפרטים פתוחים', c.ref_code, '/coops/' || c.id);
  else
    update public.coops set status = 'declined' where id = c.id returning * into c;
    perform public.notify(c.requester_id, 'coop_declined', 'בקשת שיתוף הפעולה נדחתה', c.ref_code, '/coops/' || c.id);
  end if;
  return c;
end $$;

-- The requester withdraws an unanswered request.
create or replace function public.cancel_coop(p_coop uuid) returns public.coops
language plpgsql security definer set search_path = public as $$
declare c public.coops;
begin
  update public.coops set status = 'cancelled'
    where id = p_coop and requester_id = auth.uid() and status in ('pending', 'countered')
    returning * into c;
  if not found then raise exception 'not_found'; end if;
  return c;
end $$;

-- Either side reports a closed deal on a signed, unexpired co-op.
create or replace function public.report_deal(p_coop uuid, p_sale_price bigint) returns public.deals
language plpgsql security definer set search_path = public as $$
declare c public.coops; d public.deals; other uuid;
begin
  select * into c from public.coops where id = p_coop;
  if not found or auth.uid() not in (c.owner_id, c.requester_id) then raise exception 'not_found'; end if;
  if c.status <> 'signed' then raise exception 'not_signed'; end if;
  insert into public.deals (coop_id, reported_by, sale_price) values (c.id, auth.uid(), p_sale_price) returning * into d;
  other := case when auth.uid() = c.owner_id then c.requester_id else c.owner_id end;
  perform public.notify(other, 'deal_reported', 'דווחה סגירת עסקה. נא לאשר', c.ref_code, '/coops/' || c.id);
  return d;
end $$;

-- The other side confirms (→ verified) or disputes (→ goes to arbitration).
create or replace function public.resolve_deal(p_deal uuid, p_confirm boolean) returns public.deals
language plpgsql security definer set search_path = public as $$
declare d public.deals; c public.coops;
begin
  select * into d from public.deals where id = p_deal for update;
  if not found then raise exception 'not_found'; end if;
  select * into c from public.coops where id = d.coop_id;
  if auth.uid() not in (c.owner_id, c.requester_id) or auth.uid() = d.reported_by then raise exception 'not_allowed'; end if;
  if d.status <> 'reported' then raise exception 'already_resolved'; end if;
  update public.deals set status = case when p_confirm then 'verified'::deal_status else 'disputed'::deal_status end,
                          resolved_by = auth.uid(), resolved_at = now()
    where id = d.id returning * into d;
  perform public.notify(d.reported_by, 'deal_' || d.status::text,
    case when p_confirm then 'העסקה אומתה ונוספה לפרופיל' else 'העסקה סומנה במחלוקת ועוברת לבוררות' end,
    c.ref_code, '/coops/' || c.id);
  return d;
end $$;

-- Admin: verify / reject / suspend an agent.
create or replace function public.admin_set_status(p_profile uuid, p_status agent_status) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.profiles set status = p_status where id = p_profile returning * into p;
  if p_status = 'verified' then
    perform public.notify(p.id, 'verified', 'הרישיון אומת. ברוכים הבאים לקהילה', null, '/');
  end if;
  return p;
end $$;

-- Mark co-ops whose 120 days have passed. Call daily (pg_cron or a scheduled job).
create or replace function public.expire_coops() returns integer
language sql security definer set search_path = public as $$
  with x as (update public.coops set status = 'expired'
             where status = 'signed' and expires_at < now()
               and not exists (select 1 from public.deals d where d.coop_id = coops.id)
             returning 1)
  select count(*)::int from x;
$$;
revoke execute on function public.expire_coops() from public, anon, authenticated;

-- ═════════════════════════ row level security
alter table public.profiles           enable row level security;
alter table public.listings           enable row level security;
alter table public.listing_private    enable row level security;
alter table public.buyer_requests     enable row level security;
alter table public.agreement_versions enable row level security;
alter table public.coops              enable row level security;
alter table public.deals              enable row level security;
alter table public.notifications      enable row level security;

-- profiles: you see yourself; verified agents see each other; admins see all
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or (public.is_verified() and status = 'verified'));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- listings: verified agents read active ones; owners see and manage their own
create policy listings_select on public.listings for select to authenticated
  using (agent_id = auth.uid() or public.is_admin() or (public.is_verified() and status = 'active')
         or exists (select 1 from public.coops c where c.listing_id = listings.id and c.requester_id = auth.uid()));
create policy listings_insert on public.listings for insert to authenticated
  with check (agent_id = auth.uid() and public.is_verified());
create policy listings_update on public.listings for update to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy listings_delete on public.listings for delete to authenticated
  using (agent_id = auth.uid());

-- listing_private: owner, or the requester of a co-op both sides signed
create policy listing_private_select on public.listing_private for select to authenticated
  using (
    exists (select 1 from public.listings l where l.id = listing_id and l.agent_id = auth.uid())
    or exists (select 1 from public.coops c where c.listing_id = listing_private.listing_id
               and c.requester_id = auth.uid() and c.status = 'signed')
  );
create policy listing_private_write on public.listing_private for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.agent_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.agent_id = auth.uid()));

-- buyer requests: verified agents read active ones; owners manage their own
create policy requests_select on public.buyer_requests for select to authenticated
  using (agent_id = auth.uid() or public.is_admin() or (public.is_verified() and status = 'active'));
create policy requests_insert on public.buyer_requests for insert to authenticated
  with check (agent_id = auth.uid() and public.is_verified());
create policy requests_update on public.buyer_requests for update to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy requests_delete on public.buyer_requests for delete to authenticated
  using (agent_id = auth.uid());

create policy agreements_select on public.agreement_versions for select to authenticated using (true);

-- coops & deals: parties (and admins) read; writes only through the RPCs above
create policy coops_select on public.coops for select to authenticated
  using (auth.uid() in (owner_id, requester_id) or public.is_admin());
create policy deals_select on public.deals for select to authenticated
  using (public.is_admin() or exists (select 1 from public.coops c where c.id = coop_id
                                      and auth.uid() in (c.owner_id, c.requester_id)));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═════════════════════════ grants
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.listings, public.listing_private, public.buyer_requests to authenticated;
grant select, update on public.profiles, public.notifications to authenticated;
grant select on public.agreement_versions, public.coops, public.deals, public.matches, public.agent_stats to authenticated;
grant execute on function public.request_coop(uuid, text, boolean, boolean, smallint),
                          public.respond_coop(uuid, boolean), public.cancel_coop(uuid),
                          public.report_deal(uuid, bigint), public.resolve_deal(uuid, boolean),
                          public.admin_set_status(uuid, agent_status),
                          public.is_verified(), public.is_admin() to authenticated;

-- ═════════════════════════ standard agreement v1 (draft — must be reviewed by a lawyer before use)
insert into public.agreement_versions (version, title, body_md, valid_days) values ('1.0', 'הסכם שיתוף פעולה סטנדרטי · Listo',
$md$
**טיוטה לדוגמה. הנוסח הסופי ייכתב ויאושר על ידי עורך דין.**

1. **חלוקת העמלה** תהיה כפי שמופיע בהסכם זה, כפי שהציע המתווך המפרסם או כפי שסוכם בהצעה נגדית. Listo אינה קובעת חלוקה ואינה קובעת עמלה מינימלית.
2. **איסור עקיפה.** המתווך המפרסם לא יפנה ישירות לקונה, והמתווך של הקונה לא יפנה ישירות למוכר, במשך 12 חודשים ממועד החתימה.
3. **תוקף ההפניה.** ההפניה בתוקף 120 יום. עסקה שנחתמת בתקופה זו עם הקונה שבהסכם מזכה בחלוקה.
4. **רישום.** ההפניה נרשמת במערכת עם תאריך ושעה, יחד עם אישור המתווך של הקונה על הזמנת שירותי תיווך חתומה.
5. **גילוי ללקוח.** כל מתווך יגלה ללקוח שלו על שיתוף הפעולה ועל חלוקת העמלה.
6. **פרטים חסויים.** פרטי המוכר והכתובת המלאה נחשפים רק לאחר ששני הצדדים חתמו.
7. **בוררות.** מחלוקת בין הצדדים תוכרע בבוררות מהירה לפי תקנון הבוררות של Listo: בורר מתווך ותיק ועורך דין, החלטה בתוך 30 יום ומחייבת.
8. **Listo** אינה צד לעסקה ואינה גובה עמלת תיווך.
$md$, 120);
