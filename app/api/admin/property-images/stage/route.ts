import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  cleanExpiredStaging,
  cleanText,
  discardStagedImages,
  getAdminMutationContext,
  hasValidMutationOrigin,
  imageExtensions,
  isUuid,
  maximumPropertyImageBytes,
  processStorageCleanup,
  propertyImageBucket,
} from '@/lib/admin/property-mutations';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const context = await getAdminMutationContext();
  if (!context) return NextResponse.json({ error: 'Administrator authentication is required.' }, { status: 401 });

  let body: { draftId?: unknown; name?: unknown; type?: unknown; size?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid image upload request.' }, { status: 400 });
  }

  const draftId = isUuid(body.draftId) ? body.draftId : null;
  const name = cleanText(body.name, 180);
  const contentType = cleanText(body.type, 80);
  const size = Number(body.size);
  const extension = imageExtensions[contentType];
  if (!draftId || !name || !extension || !Number.isInteger(size) || size <= 0 || size > maximumPropertyImageBytes) {
    return NextResponse.json({ error: 'Use a JPG, PNG, WebP, or AVIF image no larger than 10 MB.' }, { status: 400 });
  }

  const path = `_staging/${context.admin.id}/${draftId}/${randomUUID()}.${extension}`;
  const { data: signedUpload, error: signError } = await context.supabase.storage
    .from(propertyImageBucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (signError || !signedUpload) {
    return NextResponse.json({ error: signError?.message ?? 'Unable to prepare the image upload.' }, { status: 500 });
  }

  const { error: stagingError } = await context.supabase.from('property_image_staging').insert({
    path,
    created_by: context.admin.id,
    original_name: name,
    content_type: contentType,
    size_bytes: size,
  });
  if (stagingError) {
    return NextResponse.json({ error: 'Unable to register the staged image.' }, { status: 500 });
  }

  await Promise.allSettled([
    cleanExpiredStaging(context.supabase),
    processStorageCleanup(context.supabase),
  ]);
  return NextResponse.json({ path, token: signedUpload.token });
}

export async function DELETE(request: Request) {
  if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const context = await getAdminMutationContext();
  if (!context) return NextResponse.json({ error: 'Administrator authentication is required.' }, { status: 401 });

  let body: { paths?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid staged-image cleanup request.' }, { status: 400 });
  }
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((path): path is string => typeof path === 'string' && path.startsWith(`_staging/${context.admin.id}/`)).slice(0, 30)
    : [];
  await discardStagedImages(context.supabase, context.admin.id, paths);
  return NextResponse.json({ success: true });
}
