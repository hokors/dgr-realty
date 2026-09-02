-- Admin-managed public map locations without exposing hidden map values.

alter table public.properties
add column if not exists map_location text;

alter table public.properties
add column if not exists show_map boolean not null default true;

-- Reassert column-level reads so map_location cannot be fetched directly when
-- the map toggle is off. The public function below is the only public path.
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

create or replace function public.get_public_property_map_location(p_property_id uuid)
returns table(map_location text)
language sql
stable
security definer
set search_path = ''
as $$
  select properties.map_location
  from public.properties
  where properties.id = p_property_id
    and properties.publication_status = 'published'
    and properties.show_map = true;
$$;

revoke all on function public.get_public_property_map_location(uuid) from public;
grant execute on function public.get_public_property_map_location(uuid) to anon, authenticated;

create or replace function public.get_admin_property_map_config(p_property_id uuid)
returns table(map_location text, show_map boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select properties.map_location, properties.show_map
  from public.properties
  where properties.id = p_property_id
    and public.is_admin();
$$;

revoke all on function public.get_admin_property_map_config(uuid) from public, anon;
grant execute on function public.get_admin_property_map_config(uuid) to authenticated;

-- Keep map configuration in the same transaction as the rest of a property save.
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

revoke all on function public.save_property_with_publication_atomic(uuid, uuid, boolean, uuid, jsonb, text[], jsonb, text[]) from public, anon, authenticated;
grant execute on function public.save_property_with_publication_atomic(uuid, uuid, boolean, uuid, jsonb, text[], jsonb, text[]) to service_role;
