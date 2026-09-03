import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { hasValidImageSignature } from '@/lib/security/image-signatures';
import {
  consumeRateLimit,
  createRequestId,
  getClientIp,
  hasTrustedMutationOrigin,
  hashRateLimitIdentifier,
  securityLog,
} from '@/lib/security/request';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const propertyImageBucket = 'property-images';
export const maximumPropertyImages = 30;
export const maximumPropertyImageBytes = 10 * 1024 * 1024;

export const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function cleanText(value: unknown, maximumLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) : '';
}

export function hasValidMutationOrigin(request: Request) {
  return hasTrustedMutationOrigin(request);
}

export async function getAdminMutationContext() {
  const admin = await getAdminUser();
  const supabase = createAdminSupabaseClient();
  if (!admin || !supabase) return null;
  return { admin, supabase };
}

export async function authorizeAdminMutation(
  request: Request,
  action: string,
  limit: number,
  windowSeconds: number,
) {
  const requestId = createRequestId();
  const route = new URL(request.url).pathname;
  if (!hasValidMutationOrigin(request)) {
    securityLog('admin_origin_rejected', { requestId, route, reason: action });
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Invalid request origin.' }, {
        status: 403,
        headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
      }),
    };
  }

  const context = await getAdminMutationContext();
  if (!context) {
    securityLog('admin_auth_rejected', { requestId, route, reason: action });
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Administrator authentication is required.' }, {
        status: 401,
        headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
      }),
    };
  }

  const rate = await consumeRateLimit(context.supabase, {
    bucket: `admin:${action}`,
    identifier: `${context.admin.id}|${getClientIp(request)}`,
    limit,
    windowSeconds,
  });
  if (rate.unavailable) {
    securityLog('rate_limit_unavailable', {
      requestId,
      route,
      reason: action,
      actorHash: hashRateLimitIdentifier(context.admin.id),
    });
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'This action is temporarily unavailable.' }, {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': String(rate.retryAfter), 'X-Request-ID': requestId },
      }),
    };
  }
  if (!rate.allowed) {
    securityLog('rate_limit_exceeded', {
      requestId,
      route,
      reason: action,
      actorHash: hashRateLimitIdentifier(context.admin.id),
    });
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Too many requests. Please wait and try again.' }, {
        status: 429,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': String(rate.retryAfter), 'X-Request-ID': requestId },
      }),
    };
  }

  return { ok: true as const, context, requestId };
}

export async function verifyStoredImage(
  supabase: SupabaseClient,
  path: string,
  expectedContentType: string,
  expectedSize: number,
) {
  const separator = path.lastIndexOf('/');
  if (separator <= 0) return false;
  const folder = path.slice(0, separator);
  const fileName = path.slice(separator + 1);
  const { data: entries, error: listError } = await supabase.storage
    .from(propertyImageBucket)
    .list(folder, { search: fileName, limit: 2 });
  const entry = entries?.find((item) => item.name === fileName);
  const metadata = entry?.metadata as { size?: unknown; mimetype?: unknown } | null | undefined;
  if (
    listError
    || !entry
    || Number(metadata?.size) !== expectedSize
    || metadata?.mimetype !== expectedContentType
    || expectedSize <= 0
    || expectedSize > maximumPropertyImageBytes
    || !imageExtensions[expectedContentType]
  ) return false;

  const { data: signed, error: signError } = await supabase.storage
    .from(propertyImageBucket)
    .createSignedUrl(path, 60);
  if (signError || !signed?.signedUrl) return false;

  try {
    const response = await fetch(signed.signedUrl, {
      headers: { Range: 'bytes=0-31' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !response.body) return false;
    const reader = response.body.getReader();
    const header = new Uint8Array(32);
    let offset = 0;
    while (offset < header.length) {
      const { done, value } = await reader.read();
      if (done) break;
      const length = Math.min(value.byteLength, header.length - offset);
      header.set(value.subarray(0, length), offset);
      offset += length;
    }
    await reader.cancel();
    return hasValidImageSignature(header.subarray(0, offset), expectedContentType);
  } catch {
    return false;
  }
}

export async function queueStorageCleanup(supabase: SupabaseClient, paths: string[], reason: string, lastError?: string) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (uniquePaths.length === 0) return;
  await supabase.from('storage_cleanup_queue').upsert(
    uniquePaths.map((path) => ({
      path,
      reason,
      attempts: 0,
      last_error: lastError?.slice(0, 500) ?? null,
      completed_at: null,
    })),
    { onConflict: 'path' },
  );
}

export async function removeStoragePaths(supabase: SupabaseClient, paths: string[], reason: string) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  for (const path of uniquePaths) {
    const { error } = await supabase.storage.from(propertyImageBucket).remove([path]);
    if (error) {
      await queueStorageCleanup(supabase, [path], reason, error.message);
    } else {
      await supabase
        .from('storage_cleanup_queue')
        .update({ completed_at: new Date().toISOString(), last_error: null })
        .eq('path', path);
    }
  }
}

export async function processStorageCleanup(supabase: SupabaseClient, limit = 20) {
  const { data } = await supabase
    .from('storage_cleanup_queue')
    .select('path, attempts')
    .is('completed_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  for (const item of data ?? []) {
    const { error } = await supabase.storage.from(propertyImageBucket).remove([item.path]);
    if (error) {
      await supabase
        .from('storage_cleanup_queue')
        .update({ attempts: Number(item.attempts) + 1, last_error: error.message.slice(0, 500) })
        .eq('path', item.path);
    } else {
      await supabase
        .from('storage_cleanup_queue')
        .update({ completed_at: new Date().toISOString(), last_error: null })
        .eq('path', item.path);
    }
  }
}

export async function discardStagedImages(supabase: SupabaseClient, adminId: string, paths: string[]) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (uniquePaths.length === 0) return;
  const { data } = await supabase
    .from('property_image_staging')
    .select('path, final_path')
    .eq('created_by', adminId)
    .in('path', uniquePaths);
  const trackedPaths = (data ?? []).flatMap((item) => [item.path, item.final_path]).filter((path): path is string => Boolean(path));
  await removeStoragePaths(supabase, Array.from(new Set([...uniquePaths, ...trackedPaths])), 'Abandoned staged property image');
  await supabase.from('property_image_staging').delete().eq('created_by', adminId).in('path', uniquePaths);
}

export async function cleanExpiredStaging(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('property_image_staging')
    .select('path, final_path')
    .lt('created_at', cutoff)
    .limit(20);
  const stagingPaths = (data ?? []).map((item) => item.path as string);
  const storagePaths = (data ?? []).flatMap((item) => [item.path, item.final_path]).filter((path): path is string => Boolean(path));
  if (stagingPaths.length === 0) return;
  await removeStoragePaths(supabase, storagePaths, 'Expired staged property image');
  await supabase.from('property_image_staging').delete().in('path', stagingPaths);
}
