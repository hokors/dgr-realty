-- Draft, published, and archived visibility for property listings.
-- Existing listings remain public; new listings default to draft.

do $$
begin
  create type public.property_publication_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end
$$;

alter table public.properties
add column if not exists publication_status public.property_publication_status not null default 'published';

alter table public.properties
alter column publication_status set default 'draft';

create index if not exists properties_publication_created_at_idx
on public.properties(publication_status, created_at desc);

-- Anonymous and authenticated PostgREST clients may only select presentation
-- fields. Ownership and other internal columns stay server-only.
revoke select on table public.properties from public, anon, authenticated;
grant select (
  id,
  title,
  slug,
  description,
  category_id,
  listing_type,
  price,  
  price_suffix,
  location,
  city,
  province,
  bedrooms,
  bathrooms,
  parking_spaces,
  lot_area,
  floor_area,
  status,
  featured,
  publication_status,
  created_at,
  updated_at
) on table public.properties to anon, authenticated;

drop policy if exists "Public reads properties" on public.properties;
create policy "Public reads published properties"
on public.properties
for select
to anon, authenticated
using (publication_status = 'published');

-- Prevent direct reads of photos and property-feature links belonging to a
-- draft or archived listing. Existing admin policies continue to grant admins
-- access to every row.
drop policy if exists "Public reads property images" on public.property_images;
create policy "Public reads published property images"
on public.property_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_images.property_id
      and properties.publication_status = 'published'
  )
);

drop policy if exists "Public reads property amenities" on public.property_amenities;
create policy "Public reads published property amenities"
on public.property_amenities
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_amenities.property_id
      and properties.publication_status = 'published'
  )
);

-- Wrap the recoverable property save so publication state is committed in the
-- same PostgreSQL transaction as the property, amenities, and image metadata.
create or replace function public.save_property_with_publication_atomic(
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
  v_saved record;
  v_publication_status public.property_publication_status;
begin
  v_publication_status := coalesce(
    nullif(p_payload ->> 'publication_status', '')::public.property_publication_status,
    'draft'::public.property_publication_status
  );

  for v_saved in
    select *
    from public.save_property_atomic(
      p_operation_id,
      p_property_id,
      p_create,
      p_admin_id,
      p_payload,
      p_amenities,
      p_images,
      p_staged_paths
    )
  loop
    update public.properties
    set publication_status = v_publication_status,
        map_location = nullif(trim(p_payload ->> 'map_location'), ''),
        show_map = coalesce((p_payload ->> 'show_map')::boolean, true)
    where id = v_saved.saved_property_id;

    saved_property_id := v_saved.saved_property_id;
    saved_slug := v_saved.saved_slug;
    return next;
  end loop;
end;
$$;

revoke all on function public.save_property_atomic(uuid, uuid, boolean, uuid, jsonb, text[], jsonb, text[]) from service_role;
revoke all on function public.save_property_with_publication_atomic(uuid, uuid, boolean, uuid, jsonb, text[], jsonb, text[]) from public, anon, authenticated;
grant execute on function public.save_property_with_publication_atomic(uuid, uuid, boolean, uuid, jsonb, text[], jsonb, text[]) to service_role;
