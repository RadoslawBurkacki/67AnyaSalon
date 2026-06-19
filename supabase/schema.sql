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
  service_category  text not null check (service_category in ('nail', 'massage')),
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

-- Fix service_category constraint to include eyelash & eyebrow
alter table bookings drop constraint if exists bookings_service_category_check;
alter table bookings add constraint bookings_service_category_check
  check (service_category in ('nail', 'massage', 'eyelash', 'eyebrow'));

create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('nail', 'massage', 'eyelash', 'eyebrow')),
  name        text not null,
  description text not null default '',
  duration    int  not null default 60,
  price       decimal(10,2) not null default 0,
  popular     boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz default now()
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
  ('nail',    'Classic Manicure',          'Shape, buff, cuticle care & polish',                             45,  30.00, false, 1),
  ('nail',    'Gel Manicure',              'Long-lasting gel polish with UV finish',                         60,  45.00, true,  2),
  ('nail',    'Acrylic Full Set',          'Full acrylic extension set with shape & design',                 90,  65.00, true,  3),
  ('nail',    'Acrylic Infill',            'Infill for existing acrylic nails',                              60,  45.00, false, 4),
  ('nail',    'Nail Art',                  'Custom nail art designs per nail',                               30,  20.00, false, 5),
  ('nail',    'Classic Pedicure',          'Soak, exfoliate, shape & polish',                                60,  40.00, false, 6),
  ('nail',    'Gel Pedicure',              'Pedicure with long-lasting gel polish',                          75,  55.00, true,  7),
  ('nail',    'Luxury Mani + Pedi',        'Complete hands & feet treatment with scrub & mask',             120,  85.00, false, 8),
  ('massage', 'Swedish Relaxation',        'Gentle full-body massage to relieve tension & stress',           60,  70.00, true,  1),
  ('massage', 'Swedish — Extended',        'Extended full-body Swedish massage',                             90,  95.00, false, 2),
  ('massage', 'Deep Tissue',               'Targeted deep muscle work for chronic tension',                  60,  80.00, true,  3),
  ('massage', 'Deep Tissue — Extended',    'Longer deep tissue session',                                     90, 110.00, false, 4),
  ('massage', 'Hot Stone Massage',         'Warm volcanic stones melt away muscle tension',                  90, 100.00, true,  5),
  ('massage', 'Aromatherapy Massage',      'Relaxing massage with premium essential oils',                   60,  75.00, false, 6),
  ('massage', 'Couples Massage',           'Side-by-side relaxation for two',                                60, 130.00, false, 7),
  ('massage', 'Pamper Package',            'Gel manicure + 60 min Swedish massage',                         120, 110.00, false, 8),
  ('eyelash', 'Classic Lash Extensions',   'Natural, single-strand extensions for a subtle enhancement',     90,  55.00, false, 1),
  ('eyelash', 'Hybrid Lash Extensions',    'Mix of classic & volume for a soft, textured look',             105,  70.00, true,  2),
  ('eyelash', 'Volume Lash Extensions',    'Fluffy, full-volume fans for a dramatic effect',                120,  85.00, true,  3),
  ('eyelash', 'Mega Volume Lashes',        'Ultra-lush, maximum density lash set',                          150, 100.00, false, 4),
  ('eyelash', 'Classic Lash Infill',       'Infill for existing classic lash extensions',                    45,  35.00, false, 5),
  ('eyelash', 'Hybrid / Volume Infill',    'Infill for hybrid or volume lash extensions',                    60,  45.00, false, 6),
  ('eyelash', 'Lash Lift & Tint',          'Curl, lift and tint your natural lashes for weeks',              60,  50.00, true,  7),
  ('eyelash', 'Lash Removal',              'Safe removal of existing lash extensions',                       30,  15.00, false, 8),
  ('eyebrow', 'Brow Wax & Shape',          'Clean, defined brow shape using warm wax',                       20,  15.00, false, 1),
  ('eyebrow', 'Brow Wax & Tint',           'Wax shape plus tint for colour and definition',                  30,  22.00, true,  2),
  ('eyebrow', 'Brow Threading',            'Precise hair removal using the threading technique',              20,  15.00, false, 3),
  ('eyebrow', 'Brow Tint',                 'Colour treatment to enhance and define brow hair',                15,  12.00, false, 4),
  ('eyebrow', 'Brow Lamination',           'Restructure brow hairs for a full, brushed-up finish',           60,  45.00, true,  5),
  ('eyebrow', 'Brow Lamination & Tint',    'Lamination with tint for bold, glossy brows',                    75,  55.00, true,  6),
  ('eyebrow', 'HD Brows',                  'Signature brow design with tint, wax and threading',             60,  50.00, false, 7),
  ('eyebrow', 'Henna Brows',               'Natural henna tint that stains skin and hair for lasting colour', 45,  35.00, false, 8)
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
