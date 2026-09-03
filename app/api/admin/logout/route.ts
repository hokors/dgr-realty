import { NextResponse } from 'next/server';
import { authorizeAdminMutation } from '@/lib/admin/property-mutations';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const authorization = await authorizeAdminMutation(request, 'logout', 20, 10 * 60);
  if (!authorization.ok) return authorization.response;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Sign-out is temporarily unavailable.' }, { status: 503 });
  await supabase.auth.signOut({ scope: 'local' });
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}

