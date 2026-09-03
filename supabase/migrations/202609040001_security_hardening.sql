-- Production security hardening for public forms and admin mutations.
-- Apply after the existing publication, private-image, and map migrations.

create table if not exists public.request_rate_limits (
  bucket text not null,
  identifier_hash text not null,
  window_started_at timestamptz not null default clock_timestamp(),
  request_count integer not null default 1,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (bucket, identifier_hash),
  constraint request_rate_limits_bucket_check
    check (char_length(bucket) between 1 and 80 and bucket ~ '^[a-z0-9:_-]+$'),
  constraint request_rate_limits_hash_check
    check (identifier_hash ~ '^[a-f0-9]{64}$'),
  constraint request_rate_limits_count_check check (request_count > 0)
);

alter table public.request_rate_limits enable row level security;
alter table public.request_rate_limits force row level security;
revoke all on table public.request_rate_limits from public, anon, authenticated;

create or replace function public.consume_request_rate_limit(
  p_bucket text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_bucket is null
    or char_length(p_bucket) not between 1 and 80
    or p_bucket !~ '^[a-z0-9:_-]+$'
    or p_identifier_hash is null
    or p_identifier_hash !~ '^[a-f0-9]{64}$'
    or p_limit is null
    or p_limit not between 1 and 10000
    or p_window_seconds is null
    or p_window_seconds not between 1 and 86400
  then
    raise exception 'Invalid rate-limit request.';
  end if;

  insert into public.request_rate_limits as limits (
    bucket,
    identifier_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_bucket,
    p_identifier_hash,
    v_now,
    1,
    v_now
  )
  on conflict (bucket, identifier_hash) do update set
    window_started_at = case
      when limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
      else limits.request_count + 1
    end,
    updated_at = v_now
  returning limits.window_started_at, limits.request_count
  into v_window_started_at, v_request_count;

  allowed := v_request_count <= p_limit;
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from (
      v_window_started_at + make_interval(secs => p_window_seconds) - v_now
    )))::integer
  );
  return next;
end;
$$;

revoke all on function public.consume_request_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_request_rate_limit(text, text, integer, integer) to service_role;

-- Browser sessions are read-only. All writes now pass through validated,
-- same-origin server endpoints which re-check the admin role and use the
-- server-only service credential.
revoke insert, update, delete, truncate on table public.properties from anon, authenticated;
revoke insert, update, delete, truncate on table public.property_images from anon, authenticated;
revoke insert, update, delete, truncate on table public.amenities from anon, authenticated;
revoke insert, update, delete, truncate on table public.property_amenities from anon, authenticated;
revoke insert, update, delete, truncate on table public.property_categories from anon, authenticated;
revoke insert, update, delete, truncate on table public.inquiries from anon, authenticated;

drop policy if exists "Admins manage categories" on public.property_categories;
drop policy if exists "Admins manage properties" on public.properties;
drop policy if exists "Admins manage property images" on public.property_images;
drop policy if exists "Admins manage amenities" on public.amenities;
drop policy if exists "Admins manage property amenities" on public.property_amenities;
drop policy if exists "Admins update inquiries" on public.inquiries;
drop policy if exists "Admins read all properties" on public.properties;
drop policy if exists "Admins read all property images" on public.property_images;
drop policy if exists "Admins read all amenities" on public.amenities;
drop policy if exists "Admins read all property amenities" on public.property_amenities;

create policy "Admins read all properties"
on public.properties for select to authenticated
using (public.is_admin());

create policy "Admins read all property images"
on public.property_images for select to authenticated
using (public.is_admin());

create policy "Admins read all amenities"
on public.amenities for select to authenticated
using (public.is_admin());

create policy "Admins read all property amenities"
on public.property_amenities for select to authenticated
using (public.is_admin());

-- Expose only image presentation fields through PostgREST. Storage paths and
-- the files themselves remain server-only and are served by short signed URLs.
revoke select on table public.property_images from public, anon, authenticated;
grant select (id, property_id, image_url, alt_text, display_order)
on table public.property_images to anon, authenticated;

revoke select on table public.inquiries from public, anon, authenticated;
grant select (
  id,
  property_id,
  property_title,
  full_name,
  email,
  phone,
  interest,
  preferred_location,
  message,
  source,
  status,
  notification_status,
  created_at,
  updated_at
) on table public.inquiries to authenticated;

-- No browser role can read, upload, move, overwrite, or delete raw objects.
-- The application creates admin-only signed upload tokens and short-lived
-- download URLs after checking the parent property's publication state.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'property-images';

drop policy if exists "Public reads stored property images" on storage.objects;
drop policy if exists "Published stored property images are readable" on storage.objects;
drop policy if exists "Admins read stored property images" on storage.objects;
drop policy if exists "Admins upload stored property images" on storage.objects;
drop policy if exists "Admins update stored property images" on storage.objects;
drop policy if exists "Admins delete stored property images" on storage.objects;

revoke all on function public.can_read_property_image(text) from public, anon, authenticated;

-- Database checks backstop the Zod validation in server routes. NOT VALID
-- avoids blocking deployment because of historical rows while still
-- enforcing each new or updated row.
alter table public.properties
  drop constraint if exists properties_security_lengths_check,
  add constraint properties_security_lengths_check check (
    char_length(title) between 2 and 200
    and char_length(description) <= 10000
    and char_length(location) between 1 and 240
    and char_length(city) between 1 and 120
    and char_length(province) between 1 and 120
    and (price_suffix is null or char_length(price_suffix) <= 80)
    and (map_location is null or char_length(map_location) <= 2048)
  ) not valid;

alter table public.property_images
  drop constraint if exists property_images_security_check,
  add constraint property_images_security_check check (
    display_order between 0 and 29
    and (alt_text is null or char_length(alt_text) <= 200)
    and (storage_path is null or storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|avif)$')
  ) not valid;

alter table public.property_image_staging
  drop constraint if exists property_image_staging_security_check,
  add constraint property_image_staging_security_check check (
    char_length(original_name) between 1 and 180
    and path ~ '^_staging/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'
    and (final_path is null or final_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|avif)$')
  ) not valid;

create unique index if not exists property_images_storage_path_unique_idx
on public.property_images(storage_path)
where storage_path is not null;
