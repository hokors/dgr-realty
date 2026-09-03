import { NextResponse } from 'next/server';
import {
  consumeRateLimit,
  createRequestId,
  getClientIp,
  hasTrustedMutationOrigin,
  hashRateLimitIdentifier,
  readJsonBody,
  RequestBodyError,
  securityLog,
} from '@/lib/security/request';
import { adminLoginSchema } from '@/lib/security/validation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function rateLimited(retryAfter: number, requestId: string) {
  return NextResponse.json({ error: 'Too many sign-in attempts. Please wait and try again.' }, {
    status: 429,
    headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter), 'X-Request-ID': requestId },
  });
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  if (!hasTrustedMutationOrigin(request)) {
    securityLog('login_origin_rejected', { requestId, route: '/api/admin/login' });
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });

  const ip = getClientIp(request);
  const ipLimit = await consumeRateLimit(adminClient, {
    bucket: 'admin:login:ip',
    identifier: ip,
    limit: 10,
    windowSeconds: 15 * 60,
  });
  if (ipLimit.unavailable) {
    securityLog('rate_limit_unavailable', { requestId, route: '/api/admin/login', reason: 'login_ip' });
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
  }
  if (!ipLimit.allowed) {
    securityLog('rate_limit_exceeded', { requestId, route: '/api/admin/login', reason: 'login_ip' });
    return rateLimited(ipLimit.retryAfter, requestId);
  }

  let untrustedBody: unknown;
  try {
    untrustedBody = await readJsonBody(request, 4 * 1024);
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : 'Invalid sign-in request.' }, {
      status: error instanceof RequestBodyError ? error.status : 400,
    });
  }
  const parsed = adminLoginSchema.safeParse(untrustedBody);
  if (!parsed.success) {
    securityLog('login_input_rejected', { requestId, route: '/api/admin/login' });
    return NextResponse.json({ error: 'Enter a valid email address and password.' }, { status: 400 });
  }

  const emailLimit = await consumeRateLimit(adminClient, {
    bucket: 'admin:login:account',
    identifier: parsed.data.email,
    limit: 8,
    windowSeconds: 30 * 60,
  });
  if (emailLimit.unavailable) {
    securityLog('rate_limit_unavailable', { requestId, route: '/api/admin/login', reason: 'login_account' });
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
  }
  if (!emailLimit.allowed) {
    securityLog('rate_limit_exceeded', {
      requestId,
      route: '/api/admin/login',
      reason: 'login_account',
      actorHash: hashRateLimitIdentifier(parsed.data.email),
    });
    return rateLimited(emailLimit.retryAfter, requestId);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    securityLog('login_failed', {
      requestId,
      route: '/api/admin/login',
      reason: 'invalid_credentials',
      actorHash: hashRateLimitIdentifier(parsed.data.email),
    });
    return NextResponse.json({ error: 'Invalid email address or password.' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
    });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile?.role !== 'admin') {
    await supabase.auth.signOut({ scope: 'local' });
    securityLog('login_failed', {
      requestId,
      route: '/api/admin/login',
      reason: 'role_rejected',
      actorHash: hashRateLimitIdentifier(data.user.id),
    });
    return NextResponse.json({ error: 'Invalid email address or password.' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
    });
  }

  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
  });
}

