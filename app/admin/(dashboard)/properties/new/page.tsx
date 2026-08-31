import { PropertyForm } from '@/components/admin/PropertyForm';
import type { AdminCategory } from '@/lib/admin/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function NewPropertyPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = supabase
    ? await supabase.from('property_categories').select('id, name').eq('active', true).order('display_order')
    : { data: [] };
  return <PropertyForm categories={(data as AdminCategory[] | null) ?? []} />;
}
