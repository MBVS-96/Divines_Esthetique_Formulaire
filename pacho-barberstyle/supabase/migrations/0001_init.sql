-- Pacho Barberstyle — booking schema
--
-- Design notes
--   * The barber works alone, so a single busy timeline is enough: one
--     exclusion constraint guarantees two active appointments can never
--     overlap, whatever the client does.
--   * Anonymous visitors get no direct write access. Every public action goes
--     through a SECURITY DEFINER function that re-checks opening hours, notice
--     periods and anti-abuse limits server-side.
--   * All wall-clock maths happens in the timezone stored in `settings`.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- reference

create table if not exists services (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  duration_min integer not null check (duration_min between 5 and 480),
  price_chf    numeric(7, 2) check (price_chf is null or price_chf >= 0),
  show_price   boolean not null default true,
  at_home      boolean not null default false,
  active       boolean not null default true,
  sort_order   integer not null default 0,
  name         jsonb not null,
  description  jsonb not null default '{}'::jsonb
);

create table if not exists settings (
  id                      boolean primary key default true check (id),
  timezone                text not null default 'Europe/Zurich',
  slot_step_min           integer not null default 15 check (slot_step_min between 5 and 60),
  buffer_min              integer not null default 5 check (buffer_min >= 0),
  min_notice_hours        integer not null default 2 check (min_notice_hours >= 0),
  vip_min_notice_hours    integer not null default 24 check (vip_min_notice_hours >= 0),
  max_advance_days        integer not null default 60 check (max_advance_days between 1 and 365),
  cancel_window_hours     integer not null default 24 check (cancel_window_hours >= 0),
  max_active_per_customer integer not null default 2 check (max_active_per_customer >= 1),
  -- Where new-booking alerts are sent. Set this before going live.
  barber_email            text not null default 'change-me@example.com',
  -- Used to build the cancellation links inside emails.
  site_url                text not null default 'https://pachobarberstyle.ch'
);

create table if not exists availability_rules (
  weekday      integer primary key check (weekday between 0 and 6), -- 0 = Sunday
  open_minute  integer not null default 540 check (open_minute between 0 and 1440),
  close_minute integer not null default 1200 check (close_minute between 0 and 1440),
  enabled      boolean not null default true
);

create table if not exists blocked_slots (
  id        uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  reason    text default '',
  check (ends_at > starts_at)
);

create index if not exists blocked_slots_range_idx on blocked_slots (starts_at, ends_at);

-- ----------------------------------------------------------------- bookings

create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  reference       text unique not null,
  service_id      uuid not null references services (id) on delete restrict,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text not null default 'confirmed'
                    check (status in ('confirmed', 'pending', 'cancelled', 'completed')),
  customer_name   text not null check (length(btrim(customer_name)) between 2 and 80),
  customer_email  text not null check (customer_email ~* '^[^\s@]+@[^\s@]+\.[a-z]{2,}$'),
  customer_phone  text not null check (customer_phone ~ '^\+[0-9]{9,15}$'),
  address         text,
  notes           text,
  locale          text not null default 'fr' check (locale in ('fr', 'en', 'es')),
  cancel_token    text not null,
  created_at      timestamptz not null default now(),
  cancelled_at    timestamptz,
  reminder_sent_at timestamptz,
  check (ends_at > starts_at),

  -- The hard guarantee: one barber, one appointment at a time.
  constraint bookings_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('confirmed', 'pending'))
);

create index if not exists bookings_starts_at_idx on bookings (starts_at);
create index if not exists bookings_email_idx on bookings (customer_email);
create index if not exists bookings_phone_idx on bookings (customer_phone);

-- Throttles repeated submissions from the same person.
create table if not exists booking_attempts (
  id          bigserial primary key,
  fingerprint text not null,
  created_at  timestamptz not null default now()
);

create index if not exists booking_attempts_idx on booking_attempts (fingerprint, created_at desc);

-- Queue drained by the `send-outbox` edge function.
create table if not exists email_outbox (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings (id) on delete cascade,
  kind       text not null
               check (kind in ('customer_confirmation', 'barber_notification',
                               'customer_cancellation', 'reminder')),
  to_email   text not null,
  subject    text,
  html       text,
  status     text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts   integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);

create index if not exists email_outbox_pending_idx on email_outbox (status, created_at);

-- ---------------------------------------------------------------------- RLS

alter table services           enable row level security;
alter table settings           enable row level security;
alter table availability_rules enable row level security;
alter table blocked_slots      enable row level security;
alter table bookings           enable row level security;
alter table booking_attempts   enable row level security;
alter table email_outbox       enable row level security;

-- Public reads: only what the booking page needs to render.
create policy services_public_read on services
  for select to anon, authenticated using (active);

-- `settings` itself stays private: it holds the barber's own address, which
-- has no business being readable by every visitor. The booking page reads the
-- scheduling knobs through this view instead.
create view public_settings as
  select timezone, slot_step_min, buffer_min, min_notice_hours, vip_min_notice_hours,
         max_advance_days, cancel_window_hours, max_active_per_customer
    from settings;

grant select on public_settings to anon, authenticated;

create policy availability_public_read on availability_rules
  for select to anon, authenticated using (true);

-- Everything else is the barber's, and he is the only authenticated user.
create policy services_admin_all on services
  for all to authenticated using (true) with check (true);

create policy settings_admin_all on settings
  for all to authenticated using (true) with check (true);

create policy availability_admin_all on availability_rules
  for all to authenticated using (true) with check (true);

create policy blocked_admin_all on blocked_slots
  for all to authenticated using (true) with check (true);

create policy bookings_admin_all on bookings
  for all to authenticated using (true) with check (true);

create policy outbox_admin_read on email_outbox
  for select to authenticated using (true);

-- Note: no anon policy on bookings. Anonymous visitors reach them only
-- through the functions below, which never expose other people's data.

-- Table-level grants, declared explicitly rather than inherited from the
-- project defaults. Anonymous visitors can read the menu and the opening
-- hours and nothing else; customer data is unreachable even if a policy is
-- ever loosened by accident.
grant usage on schema public to anon, authenticated;

revoke all on services, settings, availability_rules, blocked_slots,
              bookings, booking_attempts, email_outbox from anon;

grant select on services, availability_rules to anon, authenticated;
grant select, insert, update, delete
  on services, settings, availability_rules, blocked_slots, bookings, email_outbox
  to authenticated;

-- ---------------------------------------------------------------- functions

create or replace function public_get_slots(p_date date, p_service_id uuid)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  svc        services%rowtype;
  cfg        settings%rowtype;
  rule       availability_rules%rowtype;
  minute     integer;
  slot_start timestamptz;
  slot_end   timestamptz;
begin
  select * into cfg from settings limit 1;
  if not found then return; end if;

  select * into svc from services where id = p_service_id and active;
  -- The at-home service is quoted, not gridded.
  if not found or svc.at_home then return; end if;

  select * into rule
    from availability_rules
   where weekday = extract(dow from p_date)::integer;
  if not found or not rule.enabled or rule.close_minute <= rule.open_minute then return; end if;

  if p_date < (now() at time zone cfg.timezone)::date
     or p_date > (now() at time zone cfg.timezone)::date + cfg.max_advance_days then
    return;
  end if;

  minute := rule.open_minute;
  while minute <= rule.close_minute - svc.duration_min loop
    slot_start := timezone(cfg.timezone, p_date::timestamp + make_interval(mins => minute));
    slot_end   := slot_start + make_interval(mins => svc.duration_min);

    if slot_start >= now() + make_interval(hours => cfg.min_notice_hours)
       and not exists (
         select 1
           from bookings b
          where b.status in ('confirmed', 'pending')
            and tstzrange(b.starts_at - make_interval(mins => cfg.buffer_min),
                          b.ends_at   + make_interval(mins => cfg.buffer_min))
                && tstzrange(slot_start, slot_end)
       )
       and not exists (
         select 1
           from blocked_slots x
          where tstzrange(x.starts_at, x.ends_at) && tstzrange(slot_start, slot_end)
       )
    then
      return next slot_start;
    end if;

    minute := minute + cfg.slot_step_min;
  end loop;
end;
$$;

create or replace function public_get_open_days(p_service_id uuid, p_from date, p_days integer)
returns setof date
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  day date;
begin
  for day in select generate_series(p_from, p_from + (least(p_days, 120) - 1), interval '1 day')::date loop
    if exists (select 1 from public_get_slots(day, p_service_id) limit 1) then
      return next day;
    end if;
  end loop;
end;
$$;

-- Reference shown to the customer: no ambiguous characters.
create or replace function generate_reference()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ACDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i integer;
begin
  for i in 1..6 loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return 'PB-' || out;
end;
$$;

create or replace function public_create_booking(
  p_service_id uuid,
  p_starts_at  timestamptz,
  p_name       text,
  p_email      text,
  p_phone      text,
  p_address    text default null,
  p_notes      text default null,
  p_locale     text default 'fr',
  p_honeypot   text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  svc          services%rowtype;
  cfg          settings%rowtype;
  clean_email  text;
  clean_phone  text;
  clean_name   text;
  active_count integer;
  attempts     integer;
  new_booking  bookings%rowtype;
begin
  -- Bots fill hidden fields; humans never see this one.
  if coalesce(btrim(p_honeypot), '') <> '' then
    return jsonb_build_object('ok', false, 'error', 'bot');
  end if;

  select * into cfg from settings limit 1;
  select * into svc from services where id = p_service_id and active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  clean_name  := btrim(p_name);
  clean_email := lower(btrim(p_email));
  clean_phone := regexp_replace(btrim(p_phone), '[^0-9+]', '', 'g');

  -- Normalise Swiss national numbers to E.164.
  if clean_phone like '00%' then
    clean_phone := '+' || substr(clean_phone, 3);
  elsif clean_phone like '0%' then
    clean_phone := '+41' || substr(clean_phone, 2);
  end if;

  if length(clean_name) < 2
     or clean_email !~* '^[^\s@]+@[^\s@]+\.[a-z]{2,}$'
     or clean_phone !~ '^\+[0-9]{9,15}$'
     or p_locale not in ('fr', 'en', 'es')
     or (svc.at_home and length(coalesce(btrim(p_address), '')) < 10) then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  -- Rate limit: 5 submissions per hour per email address.
  select count(*) into attempts
    from booking_attempts
   where fingerprint = clean_email
     and created_at > now() - interval '1 hour';
  if attempts >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  insert into booking_attempts (fingerprint) values (clean_email);

  -- Anti-abuse: cap how many upcoming appointments one person can hold.
  select count(*) into active_count
    from bookings
   where status in ('confirmed', 'pending')
     and starts_at > now()
     and (customer_email = clean_email or customer_phone = clean_phone);
  if active_count >= cfg.max_active_per_customer then
    return jsonb_build_object('ok', false, 'error', 'too_many_active');
  end if;

  if svc.at_home then
    if p_starts_at < now() + make_interval(hours => cfg.vip_min_notice_hours) then
      return jsonb_build_object('ok', false, 'error', 'too_soon');
    end if;
  else
    -- Re-derive the grid: never trust a timestamp sent by the browser.
    if not exists (
      select 1
        from public_get_slots((p_starts_at at time zone cfg.timezone)::date, svc.id) s
       where s = p_starts_at
    ) then
      return jsonb_build_object('ok', false, 'error', 'slot_taken');
    end if;
  end if;

  begin
    insert into bookings (
      reference, service_id, starts_at, ends_at, status,
      customer_name, customer_email, customer_phone,
      address, notes, locale, cancel_token
    ) values (
      generate_reference(), svc.id, p_starts_at,
      p_starts_at + make_interval(mins => svc.duration_min),
      case when svc.at_home then 'pending' else 'confirmed' end,
      clean_name, clean_email, clean_phone,
      case when svc.at_home then btrim(p_address) else null end,
      nullif(btrim(coalesce(p_notes, '')), ''),
      p_locale, encode(gen_random_bytes(16), 'hex')
    )
    returning * into new_booking;
  exception
    when exclusion_violation then
      return jsonb_build_object('ok', false, 'error', 'slot_taken');
    when unique_violation then
      return jsonb_build_object('ok', false, 'error', 'unknown');
  end;

  insert into email_outbox (booking_id, kind, to_email)
  values (new_booking.id, 'customer_confirmation', new_booking.customer_email),
         (new_booking.id, 'barber_notification', cfg.barber_email);

  return jsonb_build_object('ok', true, 'booking', to_jsonb(new_booking));
end;
$$;

create or replace function public_get_booking(p_reference text, p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_booking bookings%rowtype;
begin
  select * into found_booking
    from bookings
   where reference = p_reference
     and cancel_token = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'booking', to_jsonb(found_booking));
end;
$$;

create or replace function public_cancel_booking(p_reference text, p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  cfg           settings%rowtype;
  found_booking bookings%rowtype;
begin
  select * into cfg from settings limit 1;

  select * into found_booking
    from bookings
   where reference = p_reference
     and cancel_token = p_token
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if found_booking.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'already_cancelled');
  end if;
  -- Inside the cancellation window the customer has to call instead.
  if found_booking.starts_at - now() < make_interval(hours => cfg.cancel_window_hours) then
    return jsonb_build_object('ok', false, 'error', 'too_soon');
  end if;

  update bookings
     set status = 'cancelled',
         cancelled_at = now()
   where id = found_booking.id
  returning * into found_booking;

  insert into email_outbox (booking_id, kind, to_email)
  values (found_booking.id, 'customer_cancellation', found_booking.customer_email),
         (found_booking.id, 'barber_notification', cfg.barber_email);

  return jsonb_build_object('ok', true, 'booking', to_jsonb(found_booking));
end;
$$;

revoke all on function public_create_booking(uuid, timestamptz, text, text, text, text, text, text, text) from public;
grant execute on function public_get_slots(date, uuid) to anon, authenticated;
grant execute on function public_get_open_days(uuid, date, integer) to anon, authenticated;
grant execute on function public_create_booking(uuid, timestamptz, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public_get_booking(text, text) to anon, authenticated;
grant execute on function public_cancel_booking(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- seed data

insert into settings (id) values (true) on conflict (id) do nothing;

insert into availability_rules (weekday, open_minute, close_minute, enabled) values
  (0,    0,    0, false), -- dimanche fermé
  (1,  540, 1200, true),
  (2,  540, 1200, true),
  (3,  540, 1200, true),
  (4,  540, 1200, true),
  (5,  540, 1200, true),
  (6,  540, 1080, true)
on conflict (weekday) do nothing;

insert into services (slug, duration_min, price_chf, show_price, at_home, sort_order, name, description) values
  ('coupe', 30, 25, true, false, 1,
   '{"fr":"Coupe","en":"Haircut","es":"Corte"}'::jsonb,
   '{"fr":"Coupe aux ciseaux ou à la tondeuse, contours nets, finition et coiffage.","en":"Scissor or clipper cut, sharp outline, finish and styling.","es":"Corte a tijera o máquina, contornos definidos, acabado y peinado."}'::jsonb),
  ('barbe', 20, 15, true, false, 2,
   '{"fr":"Barbe","en":"Beard","es":"Barba"}'::jsonb,
   '{"fr":"Taille et dessin de la barbe, serviette chaude, huile de finition.","en":"Beard trim and line-up, hot towel, finishing oil.","es":"Recorte y perfilado de barba, toalla caliente, aceite de acabado."}'::jsonb),
  ('coupe-barbe', 45, 35, true, false, 3,
   '{"fr":"Coupe + Barbe","en":"Haircut + Beard","es":"Corte + Barba"}'::jsonb,
   '{"fr":"La formule complète : coupe, barbe travaillée et finitions.","en":"The full service: haircut, styled beard and finishing touches.","es":"El servicio completo: corte, barba trabajada y acabados."}'::jsonb),
  ('vip', 75, null, false, true, 4,
   '{"fr":"Service VIP 24/7 à domicile","en":"VIP 24/7 at-home service","es":"Servicio VIP 24/7 a domicilio"}'::jsonb,
   '{"fr":"Le barbier se déplace chez vous, à l''heure qui vous arrange, jour et nuit. Sur devis selon la zone et l''horaire.","en":"The barber comes to you, at the time that suits you, day or night. Quoted according to area and time.","es":"El barbero se desplaza a tu casa, a la hora que te convenga, de día o de noche. Presupuesto según zona y horario."}'::jsonb)
on conflict (slug) do nothing;
