-- Keep draft and archived property photos private at the Storage layer.
-- Published photos remain readable through short-lived signed URLs only.

update storage.buckets
set public = false
where id = 'property-images';

-- Preserve older uploads that stored only the former public URL.
update public.property_images
set storage_path = split_part(image_url, '/storage/v1/object/public/property-images/', 2)
where storage_path is null
  and image_url like '%/storage/v1/object/public/property-images/%';

drop policy if exists "Public reads stored property images" on storage.objects;
drop policy if exists "Published stored property images are readable" on storage.objects;
drop policy if exists "Admins read stored property images" on storage.objects;

create or replace function public.can_read_property_image(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.property_images
    join public.properties
      on properties.id = property_images.property_id
    where property_images.storage_path = p_storage_path
      and (
        properties.publication_status = 'published'
        or public.is_admin()
      )
  );
$$;

revoke all on function public.can_read_property_image(text) from public;
grant execute on function public.can_read_property_image(text) to anon, authenticated;

create policy "Published stored property images are readable"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'property-images'
  and public.can_read_property_image(name)
);
