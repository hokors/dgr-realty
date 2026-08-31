-- Secure lead capture for DGR Realty inquiry forms.
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  property_title text,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  phone text check (phone is null or char_length(phone) <= 40),
  interest text check (interest is null or char_length(interest) <= 120),
  preferred_location text check (preferred_location is null or char_length(preferred_location) <= 160),
  message text not null check (char_length(message) between 10 and 3000),
  source text not null check (source in ('homepage', 'property')),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  privacy_consent boolean not null check (privacy_consent = true),
  turnstile_verified boolean not null default false,
  request_fingerprint text not null,
  notification_status text not null default 'not_configured'
    check (notification_status in ('pending', 'sent', 'failed', 'not_configured')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inquiries_created_at_idx on public.inquiries(created_at desc);
create index inquiries_status_created_at_idx on public.inquiries(status, created_at desc);
create index inquiries_fingerprint_created_at_idx on public.inquiries(request_fingerprint, created_at desc);

create trigger inquiries_set_updated_at before update on public.inquiries
for each row execute function public.set_updated_at();

alter table public.inquiries enable row level security;

create policy "Admins read inquiries" on public.inquiries
for select using (public.is_admin());

create policy "Admins update inquiries" on public.inquiries
for update using (public.is_admin()) with check (public.is_admin());

-- Anonymous visitors cannot query or insert leads directly. Submissions are
-- validated by the server route, which uses a server-only Supabase secret key.
