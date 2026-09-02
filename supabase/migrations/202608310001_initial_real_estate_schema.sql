-- DGR Realty initial schema
create extension if not exists pgcrypto;

create type public.listing_type as enum ('For Sale', 'For Rent');
create type public.property_status as enum ('Available', 'Reserved', 'Sold', 'Rented', 'Under Negotiation');
create type public.user_role as enum ('viewer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'viewer',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  category_id uuid not null references public.property_categories(id),
  listing_type public.listing_type not null,
  price numeric(14,2) not null check (price >= 0),
  price_suffix text,
  location text not null,
  city text not null,
  province text not null,
  map_location text,
  show_map boolean not null default true,
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(4,1) check (bathrooms is null or bathrooms >= 0),
  parking_spaces integer check (parking_spaces is null or parking_spaces >= 0),
  lot_area numeric(14,2) check (lot_area is null or lot_area >= 0),
  floor_area numeric(14,2) check (floor_area is null or floor_area >= 0),
  status public.property_status not null default 'Available',
  featured boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  image_url text not null,
  storage_path text,
  alt_text text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (property_id, display_order)
);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.property_amenities (
  property_id uuid not null references public.properties(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (property_id, amenity_id)
);

create index properties_category_id_idx on public.properties(category_id);
create index properties_listing_type_idx on public.properties(listing_type);
create index properties_status_idx on public.properties(status);
create index properties_featured_created_at_idx on public.properties(featured, created_at desc);
create index properties_location_search_idx on public.properties using gin (to_tsvector('simple', title || ' ' || location || ' ' || city || ' ' || province));
create index property_images_property_order_idx on public.property_images(property_id, display_order);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.property_categories enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;

create policy "Users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Public reads categories" on public.property_categories for select using (active = true);
create policy "Public reads properties" on public.properties for select using (true);
create policy "Public reads property images" on public.property_images for select using (true);
create policy "Public reads amenities" on public.amenities for select using (true);
create policy "Public reads property amenities" on public.property_amenities for select using (true);

create policy "Admins manage categories" on public.property_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage properties" on public.properties for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage property images" on public.property_images for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage amenities" on public.amenities for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage property amenities" on public.property_amenities for all using (public.is_admin()) with check (public.is_admin());

insert into public.property_categories (name, slug, display_order) values
  ('House', 'house', 10),
  ('Condominium', 'condominium', 20),
  ('Lot', 'lot', 30),
  ('Raw Land', 'raw-land', 40),
  ('Rentals', 'rentals', 50),
  ('Commercial', 'commercial', 60),
  ('Farm Lot', 'farm-lot', 70)
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public;

create policy "Admins read stored property images"
on storage.objects for select using (bucket_id = 'property-images' and public.is_admin());

create policy "Admins upload stored property images"
on storage.objects for insert with check (bucket_id = 'property-images' and public.is_admin());

create policy "Admins update stored property images"
on storage.objects for update using (bucket_id = 'property-images' and public.is_admin()) with check (bucket_id = 'property-images' and public.is_admin());

create policy "Admins delete stored property images"
on storage.objects for delete using (bucket_id = 'property-images' and public.is_admin());

-- After creating the first Auth user, promote them once in the SQL editor:
-- update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
