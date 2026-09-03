import { NextResponse } from 'next/server';
import { isUuid, propertyImageBucket } from '@/lib/admin/property-mutations';
import { getAdminUser } from '@/lib/admin/auth';
import { consumeRateLimit, createRequestId, getClientIp, securityLog } from '@/lib/security/request';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type PropertyImageRouteProps = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: PropertyImageRouteProps) {
  const requestId = createRequestId();
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse('Not found', { status: 404 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return new NextResponse('Image service unavailable', { status: 503 });

  const rate = await consumeRateLimit(supabase, {
    bucket: 'public:property-image',
    identifier: getClientIp(request),
    limit: 600,
    windowSeconds: 5 * 60,
  });
  if (rate.unavailable) return new NextResponse('Image service unavailable', { status: 503 });
  if (!rate.allowed) {
    securityLog('rate_limit_exceeded', { requestId, route: '/api/property-images/[id]', reason: 'property_image' });
    return new NextResponse('Too many requests', {
      status: 429,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': String(rate.retryAfter), 'X-Request-ID': requestId },
    });
  }

  const { data: image, error } = await supabase
    .from('property_images')
    .select('storage_path, property_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !image?.storage_path) return new NextResponse('Not found', { status: 404 });
  const { data: property } = await supabase
    .from('properties')
    .select('publication_status')
    .eq('id', image.property_id)
    .maybeSingle();
  if (!property) return new NextResponse('Not found', { status: 404 });
  if (property.publication_status !== 'published' && !await getAdminUser()) {
    securityLog('private_image_access_rejected', { requestId, route: '/api/property-images/[id]' });
    return new NextResponse('Not found', { status: 404 });
  }

  const { data: signedImage, error: signError } = await supabase.storage
    .from(propertyImageBucket)
    .createSignedUrl(image.storage_path, 60);

  if (signError || !signedImage?.signedUrl) return new NextResponse('Not found', { status: 404 });

  const response = NextResponse.redirect(signedImage.signedUrl, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Request-ID', requestId);
  return response;
}
