import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminUser } from '@/lib/admin/auth';
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
  const origin = request.headers.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

export async function getAdminMutationContext() {
  const admin = await getAdminUser();
  const supabase = createAdminSupabaseClient();
  if (!admin || !supabase) return null;
  return { admin, supabase };
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
