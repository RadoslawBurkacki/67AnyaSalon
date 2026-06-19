-- Ania's Salon — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
create table if not exists bookings (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text not null,
  phone             text not null,
  service_category  text not null check (service_category in ('massage', 'eyelash', 'eyebrow')),
  service_name      text not null,
  duration_minutes  int  not null default 60,
  date              date not null,
  time_slot         text not null,
  status            text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  notes             text,
  created_at        timestamptz default now()
);

-- Index for fast date lookups
create index if not exists bookings_date_idx on bookings (date);
create index if not exists bookings_status_idx on bookings (status);

-- ============================================================
-- BLOCKED SLOTS TABLE  (admin blocks whole days or single slots)
-- ============================================================
create table if not exists blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  time_slot  text,       -- null = block applies all day
  all_day    boolean not null default false,
  reason     text,
  created_at timestamptz default now()
);

create index if not exists blocked_slots_date_idx on blocked_slots (date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Bookings: anyone can INSERT (public booking), only authenticated users can SELECT/UPDATE/DELETE
alter table bookings enable row level security;

create policy "Public can create bookings"
  on bookings for insert
  to anon
  with check (true);

create policy "Authenticated can read all bookings"
  on bookings for select
  to authenticated
  using (true);

create policy "Authenticated can update bookings"
  on bookings for update
  to authenticated
  using (true);

-- Also allow anon SELECT for the availability check (only non-sensitive columns)
create policy "Anon can check slot availability"
  on bookings for select
  to anon
  using (true);

-- Blocked slots: only authenticated (admin) can manage
alter table blocked_slots enable row level security;

create policy "Authenticated can manage blocked slots"
  on blocked_slots for all
  to authenticated
  using (true)
  with check (true);

create policy "Anon can read blocked slots"
  on blocked_slots for select
  to anon
  using (true);

-- ============================================================
-- SETTINGS TABLE  (admin-controlled feature flags / config)
-- ============================================================
create table if not exists settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

alter table settings enable row level security;

create policy "Anyone can read settings"
  on settings for select
  to anon, authenticated
  using (true);

create policy "Authenticated can upsert settings"
  on settings for all
  to authenticated
  using (true)
  with check (true);

-- Seed defaults (safe to re-run; empty string = fall back to built-in default)
insert into settings (key, value) values
  ('admin_booking_notifications', 'true'),
  ('admin_email',                 ''),
  ('from_email',                  ''),
  ('site_address',                ''),
  ('site_phone',                  ''),
  ('site_email',                  ''),
  ('site_map_url',                ''),
  ('hours_mon_fri',               ''),
  ('hours_sat',                   ''),
  ('hours_sun',                   ''),
  ('social_instagram',            ''),
  ('social_facebook',             ''),
  ('schedule_days',               '1,2,3,4,5,6'),
  ('schedule_slots',              '09:00,09:30,10:00,10:30,11:00,11:30,12:00,12:30,13:00,13:30,14:00,14:30,15:00,15:30,16:00,16:30,17:00')
  on conflict (key) do nothing;

-- ============================================================
-- SERVICES TABLE
-- ============================================================

-- Fix service_category constraint
alter table bookings drop constraint if exists bookings_service_category_check;
alter table bookings add constraint bookings_service_category_check
  check (service_category in ('massage', 'lashes'));

create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('massage', 'lashes')),
  name        text not null,
  description text not null default '',
  duration    int  not null default 60,
  price       decimal(10,2) not null default 0,
  popular          boolean not null default false,
  sort_order       int not null default 0,
  discount_price   decimal(10,2) default null,
  discount_ends_at timestamptz default null,
  created_at       timestamptz default now()
);

create index if not exists services_category_idx on services (category, sort_order);

alter table services enable row level security;

create policy "Anyone can read services"
  on services for select
  to anon, authenticated
  using (true);

create policy "Authenticated can manage services"
  on services for all
  to authenticated
  using (true)
  with check (true);

-- Seed services (skipped if table already has rows)
insert into services (category, name, description, duration, price, popular, sort_order)
select * from (values
  ('massage', 'Swedish Relaxation',        'Gentle full-body massage to relieve tension & stress',           60,  70.00, true,  1),
  ('massage', 'Swedish — Extended',        'Extended full-body Swedish massage',                             90,  95.00, false, 2),
  ('massage', 'Deep Tissue',               'Targeted deep muscle work for chronic tension',                  60,  80.00, true,  3),
  ('massage', 'Deep Tissue — Extended',    'Longer deep tissue session',                                     90, 110.00, false, 4),
  ('massage', 'Hot Stone Massage',         'Warm volcanic stones melt away muscle tension',                  90, 100.00, true,  5),
  ('massage', 'Aromatherapy Massage',      'Relaxing massage with premium essential oils',                   60,  75.00, false, 6),
  ('massage', 'Couples Massage',           'Side-by-side relaxation for two',                                60, 130.00, false, 7),
  ('massage', 'Pamper Package',                        'Gel manicure + 60 min Swedish massage',                                                     120, 110.00, false, 8),
  ('lashes',  'Classic Lash Extensions',               'Single-strand classic extensions for a natural, subtle look',                               105,  20.00, false, 1),
  ('lashes',  'Eyelash Extensions + Brow Lamination',  'Full lash set combined with brow lamination — add your preferred lash style in the notes', 180,  60.00, true,  2),
  ('lashes',  'Double Classic Eyelash Extensions',     'Two layers of classic lash extensions for added fullness',                                  120,  25.00, false, 3),
  ('lashes',  'Russian Eyelash Extensions',            'Handmade volume fans for a glamorous, full lash look',                                      135,  30.00, true,  4),
  ('lashes',  'Hybrid Eyelash Extensions',             'A mix of classic and Russian volume for a textured, natural-glam result',                   120,  28.00, false, 5),
  ('lashes',  'Eyebrow Tint and Wax',                  'Brow tint combined with a clean wax shape',                                                  30,  12.00, false, 6),
  ('lashes',  'Eyebrow Lamination',                    'Brow lamination with tint and wax included for bold, brushed-up brows',                      50,  25.00, false, 7)
) as v(category, name, description, duration, price, popular, sort_order)
where not exists (select 1 from services limit 1);

-- ============================================================
-- ADMIN USER SETUP
-- ============================================================
-- After running this schema:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create an account with your admin email & password
-- 3. That email/password is what you use to log in at /admin/login
-- ============================================================

-- ============================================================
-- MIGRATIONS (run against existing DB if schema already applied)
-- ============================================================
alter table services add column if not exists discount_price   decimal(10,2) default null;
alter table services add column if not exists discount_ends_at timestamptz   default null;

-- Merge eyelash + eyebrow into 'lashes' category
update services set category = 'lashes' where category in ('eyelash', 'eyebrow');
alter table services drop constraint if exists services_category_check;
alter table services add constraint services_category_check
  check (category in ('massage', 'lashes'));
alter table bookings drop constraint if exists bookings_service_category_check;
alter table bookings add constraint bookings_service_category_check
  check (service_category in ('massage', 'lashes'));
update bookings set service_category = 'lashes' where service_category in ('eyelash', 'eyebrow');
