import { notFound } from 'next/navigation';
import { PropertyForm } from '@/components/admin/PropertyForm';
import type { AdminCategory, AdminProperty } from '@/lib/admin/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type EditPropertyPageProps = { params: Promise<{ id: string }> };

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const [{ data: property }, { data: categories }] = await Promise.all([
    supabase
      .from('properties')
      .select('id, title, slug, description, category_id, listing_type, price, price_suffix, location, city, province, bedrooms, bathrooms, parking_spaces, lot_area, floor_area, status, featured, publication_status, created_at, updated_at, property_images(id, image_url, storage_path, alt_text, display_order), property_amenities(amenities(name))')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('property_categories').select('id, name').eq('active', true).order('display_order'),
  ]);

  if (!property) notFound();
  const { data: mapRows } = await supabase.rpc('get_admin_property_map_config', { p_property_id: id });
  const mapConfig = (mapRows as Array<{ map_location: string | null; show_map: boolean }> | null)?.[0];
  const normalized = {
    ...property,
    price: Number(property.price),
    lot_area: property.lot_area === null ? null : Number(property.lot_area),
    floor_area: property.floor_area === null ? null : Number(property.floor_area),
    bathrooms: property.bathrooms === null ? null : Number(property.bathrooms),
    map_location: mapConfig?.map_location ?? null,
    show_map: mapConfig?.show_map ?? true,
    property_images: (property.property_images ?? []).map((image) => ({
      ...image,
      image_url: image.storage_path ? `/api/property-images/${image.id}` : image.image_url,
    })),
  } as unknown as AdminProperty;

  return <PropertyForm categories={(categories as AdminCategory[] | null) ?? []} initialProperty={normalized} />;
}
