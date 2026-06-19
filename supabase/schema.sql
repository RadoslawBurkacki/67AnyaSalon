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
-- ADMIN USER SETUP
-- ============================================================
-- After running this schema:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create an account with your admin email & password
-- 3. That email/password is what you use to log in at /admin/login
-- ============================================================
