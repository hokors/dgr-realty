-- Recoverable, transactional admin property mutations.
-- Storage uploads are staged first; database metadata is committed atomically,
-- and storage deletions are retained in a retryable cleanup queue.

create table public.property_image_staging (
  path text primary key,
  created_by uuid not null references public.profiles(id) on delete cascade,
  original_name text not null,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  final_path text,
  created_at timestamptz not null default now()
);

create index property_image_staging_created_at_idx
on public.property_image_staging(created_at);

create table public.storage_cleanup_queue (
  path text primary key,
  reason text not null,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index storage_cleanup_queue_pending_idx
on public.storage_cleanup_queue(created_at)
where completed_at is null;

create table public.property_mutation_requests (
  operation_id uuid primary key,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.property_image_staging enable row level security;
alter table public.storage_cleanup_queue enable row level security;
alter table public.property_mutation_requests enable row level security;

-- These tables are internal implementation details. Browser clients receive no
-- policies; only server-side service credentials can access them.
revoke all on public.property_image_staging from public, anon, authenticated;
revoke all on public.storage_cleanup_queue from public, anon, authenticated;
revoke all on public.property_mutation_requests from public, anon, authenticated;

create or replace function public.save_property_atomic(
  p_operation_id uuid,
  p_property_id uuid,
  p_create boolean,
  p_admin_id uuid,
  p_payload jsonb,
  p_amenities text[],
  p_images jsonb,
  p_staged_paths text[] default array[]::text[]
)
returns table(saved_property_id uuid, saved_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property_id uuid := p_property_id;
  v_existing_property_id uuid;
  v_slug_base text;
  v_slug text;
  v_suffix integer := 2;
  v_amenity_name text;
  v_amenity_slug text;
  v_amenity_id uuid;
  v_staged_count integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'Administrator authorization is required.';
  end if;

  if p_operation_id is null or p_property_id is null then
    raise exception 'Operation and property identifiers are required.';
  end if;

  select property_id into v_existing_property_id
  from public.property_mutation_requests
  where operation_id = p_operation_id and created_by = p_admin_id;

  if v_existing_property_id is not null then
    return query
      select properties.id, properties.slug
      from public.properties
      where properties.id = v_existing_property_id;
    return;
  end if;

  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(p_images) <> 'array' then
    raise exception 'Invalid property mutation payload.';
  end if;

  if jsonb_array_length(p_images) > 30 then
    raise exception 'A property can have at most 30 images.';
  end if;

  if not exists (
    select 1 from public.property_categories
    where id = (p_payload ->> 'category_id')::uuid and active = true
  ) then
    raise exception 'The selected property category is invalid.';
  end if;

  select count(*) into v_staged_count
  from public.property_image_staging
  where created_by = p_admin_id
    and path = any(coalesce(p_staged_paths, array[]::text[]));

  if v_staged_count <> cardinality(coalesce(p_staged_paths, array[]::text[])) then
    raise exception 'One or more staged property images are invalid.';
  end if;

  if p_create then
    if exists (select 1 from public.properties where id = v_property_id) then
      raise exception 'The property identifier is already in use.';
    end if;

    v_slug_base := trim(both '-' from regexp_replace(lower(coalesce(p_payload ->> 'title', '')), '[^a-z0-9]+', '-', 'g'));
    if v_slug_base = '' then v_slug_base := 'property'; end if;
    v_slug_base := left(v_slug_base, 80);
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_slug_base));
    v_slug := v_slug_base;
    while exists (select 1 from public.properties where slug = v_slug) loop
      v_slug := left(v_slug_base, greatest(1, 79 - length(v_suffix::text))) || '-' || v_suffix::text;
      v_suffix := v_suffix + 1;
    end loop;

    insert into public.properties (
      id, title, slug, description, category_id, listing_type, price,
      price_suffix, location, city, province, bedrooms, bathrooms,
      parking_spaces, lot_area, floor_area, status, featured, created_by
    ) values (
      v_property_id,
      trim(p_payload ->> 'title'),
      v_slug,
      coalesce(trim(p_payload ->> 'description'), ''),
      (p_payload ->> 'category_id')::uuid,
      (p_payload ->> 'listing_type')::public.listing_type,
      (p_payload ->> 'price')::numeric,
      nullif(trim(p_payload ->> 'price_suffix'), ''),
      trim(p_payload ->> 'location'),
      trim(p_payload ->> 'city'),
      trim(p_payload ->> 'province'),
      nullif(p_payload ->> 'bedrooms', '')::integer,
      nullif(p_payload ->> 'bathrooms', '')::numeric,
      nullif(p_payload ->> 'parking_spaces', '')::integer,
      nullif(p_payload ->> 'lot_area', '')::numeric,
      nullif(p_payload ->> 'floor_area', '')::numeric,
      (p_payload ->> 'status')::public.property_status,
      (p_payload ->> 'featured')::boolean,
      p_admin_id
    );
  else
    select slug into v_slug from public.properties where id = v_property_id for update;
    if v_slug is null then raise exception 'Property not found.'; end if;

    update public.properties set
      title = trim(p_payload ->> 'title'),
      description = coalesce(trim(p_payload ->> 'description'), ''),
      category_id = (p_payload ->> 'category_id')::uuid,
      listing_type = (p_payload ->> 'listing_type')::public.listing_type,
      price = (p_payload ->> 'price')::numeric,
      price_suffix = nullif(trim(p_payload ->> 'price_suffix'), ''),
      location = trim(p_payload ->> 'location'),
      city = trim(p_payload ->> 'city'),
      province = trim(p_payload ->> 'province'),
      bedrooms = nullif(p_payload ->> 'bedrooms', '')::integer,
      bathrooms = nullif(p_payload ->> 'bathrooms', '')::numeric,
      parking_spaces = nullif(p_payload ->> 'parking_spaces', '')::integer,
      lot_area = nullif(p_payload ->> 'lot_area', '')::numeric,
      floor_area = nullif(p_payload ->> 'floor_area', '')::numeric,
      status = (p_payload ->> 'status')::public.property_status,
      featured = (p_payload ->> 'featured')::boolean
    where id = v_property_id;
  end if;

  delete from public.property_amenities where property_id = v_property_id;
  foreach v_amenity_name in array coalesce(p_amenities, array[]::text[]) loop
    v_amenity_name := left(trim(v_amenity_name), 120);
    if v_amenity_name = '' then continue; end if;
    v_amenity_slug := trim(both '-' from regexp_replace(lower(v_amenity_name), '[^a-z0-9]+', '-', 'g'));
    if v_amenity_slug = '' then continue; end if;

    insert into public.amenities (name, slug)
    values (v_amenity_name, v_amenity_slug)
    on conflict do nothing;

    select id into v_amenity_id
    from public.amenities
    where slug = v_amenity_slug or lower(name) = lower(v_amenity_name)
    order by (slug = v_amenity_slug) desc
    limit 1;

    if v_amenity_id is null then raise exception 'Unable to save amenity.'; end if;
    insert into public.property_amenities (property_id, amenity_id)
    values (v_property_id, v_amenity_id)
    on conflict do nothing;
  end loop;

  insert into public.storage_cleanup_queue (path, reason)
  select property_images.storage_path, 'Property image removed or replaced'
  from public.property_images
  where property_images.property_id = v_property_id
    and property_images.storage_path is not null
    and not exists (
      select 1
      from jsonb_array_elements(p_images) as image_item
      where nullif(image_item ->> 'id', '')::uuid = property_images.id
    )
  on conflict (path) do update set
    reason = excluded.reason,
    attempts = 0,
    last_error = null,
    completed_at = null;

  delete from public.property_images where property_id = v_property_id;

  insert into public.property_images (
    id, property_id, image_url, storage_path, alt_text, display_order
  )
  select
    (image_item.value ->> 'id')::uuid,
    v_property_id,
    image_item.value ->> 'image_url',
    nullif(image_item.value ->> 'storage_path', ''),
    nullif(image_item.value ->> 'alt_text', ''),
    (image_item.ordinality - 1)::integer
  from jsonb_array_elements(p_images) with ordinality as image_item(value, ordinality);

  delete from public.property_image_staging
  where created_by = p_admin_id
    and path = any(coalesce(p_staged_paths, array[]::text[]));

  insert into public.property_mutation_requests (operation_id, property_id, created_by)
  values (p_operation_id, v_property_id, p_admin_id);

  return query select v_property_id, v_slug;
end;
$$;

create or replace function public.delete_property_atomic(
  p_property_id uuid,
  p_admin_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_id uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'Administrator authorization is required.';
  end if;

  insert into public.storage_cleanup_queue (path, reason)
  select storage_path, 'Property deleted'
  from public.property_images
  where property_id = p_property_id and storage_path is not null
  on conflict (path) do update set
    reason = excluded.reason,
    attempts = 0,
    last_error = null,
    completed_at = null;

  delete from public.properties where id = p_property_id returning id into v_deleted_id;
  return v_deleted_id is not null;
end;
$$;

revoke all on function public.save_property_atomic(uuid, uuid, boolean, uuid, jsonb, text[], jsonb, text[]) from public, anon, authenticated;
revoke all on function public.delete_property_atomic(uuid, uuid) from public, anon, authenticated;
grant execute on function public.save_property_atomic(uuid, uuid, boolean, uuid, jsonb, text[], jsonb, text[]) to service_role;
grant execute on function public.delete_property_atomic(uuid, uuid) to service_role;
