-- Run using Supabase SQL Editor or Supabase CLI. All tables use UUID primary keys.
create extension if not exists pgcrypto;
create table if not exists public.services (
 id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
 description text not null, image_path text not null, display_order int not null default 0,
 published boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.testimonials (
 id uuid primary key default gen_random_uuid(), quote text not null, author text not null,
 context text not null default '', display_order int not null default 0,
 published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.inquiries (
 id uuid primary key default gen_random_uuid(), name text not null, email text not null,
 phone text not null, service text not null, event_date date, message text,
 status text not null default 'new' check(status in ('new','contacted','confirmed','closed')),
 created_at timestamptz not null default now()
);
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
-- Server accesses Supabase using SERVICE_ROLE_KEY, never shipped to browser.
alter table public.services enable row level security;
alter table public.testimonials enable row level security;
alter table public.inquiries enable row level security;
alter table public.admin_users enable row level security;
revoke all on public.inquiries from anon,authenticated;
revoke all on public.admin_users from anon,authenticated;
-- Only published catalog entries can be read directly from the browser.
create policy "published services visible" on public.services for select to anon,authenticated using(published=true);
create policy "published testimonials visible" on public.testimonials for select to anon,authenticated using(published=true);
insert into public.services(slug,title,description,image_path,display_order) values
('bridal-makeup','Bridal Makeup','Luxury bridal beauty for weddings and destination weddings.','/pictures/bridal-2.png',1),
('engagement-makeup','Engagement Makeup','Elegant looks for engagements and pre-wedding events.','/pictures/engagement-2.png',2),
('party-makeup','Party Makeup','Sophisticated glam for celebrations and special occasions.','/pictures/party-2.png',3),
('photoshoot-makeup','Photoshoot Makeup','Editorial, fashion, influencer and commercial shoots.','/pictures/photoshoot-2.JPG',4),
('makeup-masterclasses','Makeup Masterclasses','Professional and beginner-friendly makeup education.','/pictures/masterclass-2.JPG',5)
on conflict(slug) do nothing;
