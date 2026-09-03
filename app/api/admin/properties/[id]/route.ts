import { NextResponse } from 'next/server';
import { authorizeAdminMutation, processStorageCleanup } from '@/lib/admin/property-mutations';
import { databaseErrorCode, readJsonBody, RequestBodyError, securityLog } from '@/lib/security/request';
import { propertyQuickUpdateSchema, uuidSchema } from '@/lib/security/validation';
import type { PropertyPublicationStatus } from '@/lib/types';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteProps) {
  const authorization = await authorizeAdminMutation(request, 'property-update', 60, 10 * 60);
  if (!authorization.ok) return authorization.response;
  const { context, requestId } = authorization;
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid property identifier.' }, { status: 400 });

  let untrustedBody: unknown;
  try {
    untrustedBody = await readJsonBody(request, 4 * 1024);
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : 'Invalid property update request.' }, {
      status: error instanceof RequestBodyError ? error.status : 400,
    });
  }

  const parsed = propertyQuickUpdateSchema.safeParse(untrustedBody);
  if (!parsed.success) {
    securityLog('admin_input_rejected', { requestId, route: '/api/admin/properties/[id]', reason: 'schema_validation' });
    return NextResponse.json({ error: 'No valid property changes were provided.' }, { status: 400 });
  }
  const body = parsed.data;
  const updates: { status?: string; featured?: boolean; publication_status?: PropertyPublicationStatus } = {};
  if (body.status) updates.status = body.status;
  if (body.featured !== undefined) updates.featured = body.featured;
  if (body.publicationStatus) updates.publication_status = body.publicationStatus;

  const { data, error } = await context.supabase.from('properties').update(updates).eq('id', id).select('id, status, featured, publication_status').maybeSingle();
  if (error) {
    securityLog('admin_property_update_failed', { requestId, route: '/api/admin/properties/[id]', reason: 'database_update', errorCode: databaseErrorCode(error) });
    return NextResponse.json({ error: 'Unable to update the property.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
  return NextResponse.json({ success: true, property: data });
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const authorization = await authorizeAdminMutation(request, 'property-delete', 20, 10 * 60);
  if (!authorization.ok) return authorization.response;
  const { context, requestId } = authorization;
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid property identifier.' }, { status: 400 });

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
    securityLog('admin_property_delete_failed', { requestId, route: '/api/admin/properties/[id]', reason: 'database_transaction', errorCode: databaseErrorCode(error) });
    return NextResponse.json({ error: 'Unable to delete the property.' }, { status: 500 });
  }
  await processStorageCleanup(context.supabase);
  return NextResponse.json({ success: true, deleted: data === true });
}
