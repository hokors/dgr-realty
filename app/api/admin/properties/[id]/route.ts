import { NextResponse } from 'next/server';
import { authorizeAdminMutation, processStorageCleanup } from '@/lib/admin/property-mutations';
import { getPublicationQualityIssues, normalizePropertyContent } from '@/lib/property-quality';
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
  const updates: {
    status?: string;
    featured?: boolean;
    publication_status?: PropertyPublicationStatus;
    title?: string;
    description?: string;
    price_suffix?: string | null;
    location?: string;
    city?: string;
    province?: string;
  } = {};
  if (body.status) updates.status = body.status;
  if (body.featured !== undefined) updates.featured = body.featured;
  if (body.publicationStatus) updates.publication_status = body.publicationStatus;

  if (body.publicationStatus === 'published' || body.featured === true) {
    const { data: current, error: currentError } = await context.supabase
      .from('properties')
      .select('title, description, listing_type, price_suffix, location, city, province, featured, publication_status, property_images(id)')
      .eq('id', id)
      .maybeSingle();
    if (currentError) {
      securityLog('admin_property_update_failed', { requestId, route: '/api/admin/properties/[id]', reason: 'quality_lookup', errorCode: databaseErrorCode(currentError) });
      return NextResponse.json({ error: 'Unable to verify listing quality.' }, { status: 500 });
    }
    if (!current) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });

    const normalized = normalizePropertyContent({
      title: current.title,
      description: current.description ?? '',
      listingType: current.listing_type,
      priceSuffix: current.price_suffix,
      location: current.location,
      city: current.city,
      province: current.province,
    });
    const targetPublicationStatus = body.publicationStatus ?? current.publication_status;
    if (targetPublicationStatus === 'published') {
      const qualityIssues = getPublicationQualityIssues({
        ...normalized,
        featured: body.featured ?? current.featured,
        imageCount: current.property_images?.length ?? 0,
      });
      if (qualityIssues.length > 0) {
        return NextResponse.json({
          error: 'This listing is not ready to publish yet.',
          issues: qualityIssues,
        }, { status: 422 });
      }
      Object.assign(updates, {
        title: normalized.title,
        description: normalized.description,
        price_suffix: normalized.priceSuffix ?? null,
        location: normalized.location,
        city: normalized.city,
        province: normalized.province,
      });
    }
  }

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
