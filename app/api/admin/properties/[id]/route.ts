import { NextResponse } from 'next/server';
import { getAdminMutationContext, hasValidMutationOrigin, isUuid, processStorageCleanup } from '@/lib/admin/property-mutations';
import { propertyStatuses } from '@/lib/admin/types';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteProps) {
  if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const context = await getAdminMutationContext();
  if (!context) return NextResponse.json({ error: 'Administrator authentication and server configuration are required.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid property identifier.' }, { status: 400 });

  let body: { status?: unknown; featured?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid property update request.' }, { status: 400 });
  }

  const updates: { status?: string; featured?: boolean } = {};
  if (typeof body.status === 'string' && propertyStatuses.includes(body.status as (typeof propertyStatuses)[number])) updates.status = body.status;
  if (typeof body.featured === 'boolean') updates.featured = body.featured;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid property changes were provided.' }, { status: 400 });

  const { data, error } = await context.supabase.from('properties').update(updates).eq('id', id).select('id, status, featured').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
  return NextResponse.json({ success: true, property: data });
}

export async function DELETE(request: Request, { params }: RouteProps) {
  if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const context = await getAdminMutationContext();
  if (!context) return NextResponse.json({ error: 'Administrator authentication and server configuration are required.' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid property identifier.' }, { status: 400 });

  const { data, error } = await context.supabase.rpc('delete_property_atomic', {
    p_property_id: id,
    p_admin_id: context.admin.id,
  });
  if (error) {
    // The RPC may have committed even if its response was interrupted. Treat a
    // confirmed missing row as a recovered success and drain its cleanup work.
    const { data: property, error: checkError } = await context.supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (!checkError && !property) {
      await processStorageCleanup(context.supabase);
      return NextResponse.json({ success: true, deleted: true, recovered: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await processStorageCleanup(context.supabase);
  return NextResponse.json({ success: true, deleted: data === true });
}
