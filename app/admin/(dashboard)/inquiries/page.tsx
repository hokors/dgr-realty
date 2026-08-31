import { InquiryManager, type InquiryRow } from '@/components/admin/InquiryManager';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AdminInquiriesPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = supabase
    ? await supabase
        .from('inquiries')
        .select('id, property_title, full_name, email, phone, interest, preferred_location, message, source, status, notification_status, created_at')
        .order('created_at', { ascending: false })
    : { data: [] };

  return <InquiryManager initialInquiries={(data as InquiryRow[] | null) ?? []} />;
}
