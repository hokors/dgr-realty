import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getAdminUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') return null;

  return {
    id: user.id,
    email: user.email ?? 'Administrator',
    fullName: profile.full_name as string | null,
  };
}

export async function requireAdminUser() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  return admin;
}
