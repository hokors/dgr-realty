import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  authorizeAdminMutation,
  cleanExpiredStaging,
  discardStagedImages,
  imageExtensions,
  processStorageCleanup,
  propertyImageBucket,
} from '@/lib/admin/property-mutations';
import { databaseErrorCode, readJsonBody, RequestBodyError, securityLog } from '@/lib/security/request';
import { imageCleanupSchema, imageStageSchema } from '@/lib/security/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const authorization = await authorizeAdminMutation(request, 'image-upload', 180, 10 * 60);
  if (!authorization.ok) return authorization.response;
  const { context, requestId } = authorization;

  let untrustedBody: unknown;
  try {
    untrustedBody = await readJsonBody(request, 4 * 1024);
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : 'Invalid image upload request.' }, {
      status: error instanceof RequestBodyError ? error.status : 400,
    });
  }

  const parsed = imageStageSchema.safeParse(untrustedBody);
  if (!parsed.success) {
    securityLog('admin_upload_rejected', { requestId, route: '/api/admin/property-images/stage', reason: 'metadata_validation' });
    return NextResponse.json({ error: 'Use a JPG, PNG, WebP, or AVIF image no larger than 10 MB.' }, { status: 400 });
  }
  const { draftId, name, type: contentType, size } = parsed.data;
  const extension = imageExtensions[contentType];

  const path = `_staging/${context.admin.id}/${draftId}/${randomUUID()}.${extension}`;
  const { data: signedUpload, error: signError } = await context.supabase.storage
    .from(propertyImageBucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (signError || !signedUpload) {
    securityLog('admin_upload_failed', { requestId, route: '/api/admin/property-images/stage', reason: 'signed_upload', errorCode: databaseErrorCode(signError) });
    return NextResponse.json({ error: 'Unable to prepare the image upload.' }, { status: 500 });
  }

  const { error: stagingError } = await context.supabase.from('property_image_staging').insert({
    path,
    created_by: context.admin.id,
    original_name: name,
    content_type: contentType,
    size_bytes: size,
  });
  if (stagingError) {
    securityLog('admin_upload_failed', { requestId, route: '/api/admin/property-images/stage', reason: 'staging_record', errorCode: databaseErrorCode(stagingError) });
    return NextResponse.json({ error: 'Unable to register the staged image.' }, { status: 500 });
  }

  await Promise.allSettled([
    cleanExpiredStaging(context.supabase),
    processStorageCleanup(context.supabase),
  ]);
  return NextResponse.json({ path, token: signedUpload.token });
}

export async function DELETE(request: Request) {
  const authorization = await authorizeAdminMutation(request, 'image-cleanup', 120, 10 * 60);
  if (!authorization.ok) return authorization.response;
  const { context, requestId } = authorization;

  let untrustedBody: unknown;
  try {
    untrustedBody = await readJsonBody(request, 20 * 1024);
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : 'Invalid staged-image cleanup request.' }, {
      status: error instanceof RequestBodyError ? error.status : 400,
    });
  }
  const parsed = imageCleanupSchema.safeParse(untrustedBody);
  if (!parsed.success || parsed.data.paths.some((path) => !path.startsWith(`_staging/${context.admin.id}/`))) {
    securityLog('admin_input_rejected', { requestId, route: '/api/admin/property-images/stage', reason: 'cleanup_paths' });
    return NextResponse.json({ error: 'Invalid staged-image cleanup request.' }, { status: 400 });
  }
  const paths = parsed.data.paths;
  await discardStagedImages(context.supabase, context.admin.id, paths);
  return NextResponse.json({ success: true });
}
