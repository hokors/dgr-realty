import { PropertyManager, type PropertyManagerRow } from '@/components/admin/PropertyManager';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AdminPropertiesPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = supabase
    ? await supabase
        .from('properties')
        .select('id, title, slug, price, listing_type, status, featured, city, property_categories(name), property_images(id, storage_path)')
        .order('created_at', { ascending: false })
    : { data: [] };

  const rows = ((data as unknown as PropertyManagerRow[] | null) ?? []).map((row) => ({ ...row, price: Number(row.price) }));
  return <PropertyManager initialProperties={rows} />;
}
