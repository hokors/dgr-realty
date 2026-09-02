import { NextResponse } from 'next/server';
import { isUuid, propertyImageBucket } from '@/lib/admin/property-mutations';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PropertyImageRouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: PropertyImageRouteProps) {
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse('Not found', { status: 404 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return new NextResponse('Image service unavailable', { status: 503 });

  // Property-image RLS exposes published images to everyone and drafts only to
  // authenticated admins. Do this lookup before creating any Storage URL.
  const { data: image, error } = await supabase
    .from('property_images')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle();

  if (error || !image?.storage_path) return new NextResponse('Not found', { status: 404 });

  const { data: signedImage, error: signError } = await supabase.storage
    .from(propertyImageBucket)
    .createSignedUrl(image.storage_path, 60);

  if (signError || !signedImage?.signedUrl) return new NextResponse('Not found', { status: 404 });

  const response = NextResponse.redirect(signedImage.signedUrl, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
