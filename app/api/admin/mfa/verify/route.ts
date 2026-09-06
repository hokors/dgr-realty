import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import {
  consumeRateLimit,
  createRequestId,
  getClientIp,
  hasTrustedMutationOrigin,
  readJsonBody,
  RequestBodyError,
  securityLog,
} from '@/lib/security/request';
import { adminMfaVerifySchema } from '@/lib/security/validation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = createRequestId();
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const admin = await getAdminUser({ requireMfa: false });
  const serviceClient = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  if (!admin || !serviceClient || !supabase) {
    return NextResponse.json({ error: 'Sign in with your email and password first.' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
    });
  }

  const rate = await consumeRateLimit(serviceClient, {
    bucket: 'admin:mfa',
    identifier: `${admin.id}|${getClientIp(request)}`,
    limit: 10,
    windowSeconds: 10 * 60,
  });
  if (rate.unavailable || !rate.allowed) {
    return NextResponse.json({ error: rate.unavailable ? 'Verification is temporarily unavailable.' : 'Too many attempts. Please wait and try again.' }, {
      status: rate.unavailable ? 503 : 429,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': String(rate.retryAfter), 'X-Request-ID': requestId },
    });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 2 * 1024);
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : 'Invalid verification request.' }, {
      status: error instanceof RequestBodyError ? error.status : 400,
    });
  }
  const parsed = adminMfaVerifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Enter the six-digit code from your authenticator app.' }, { status: 400 });

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  const factor = factors?.all.find((item) => item.id === parsed.data.factorId && item.factor_type === 'totp');
  if (factorsError || !factor) {
    securityLog('admin_mfa_rejected', { requestId, route: '/api/admin/mfa/verify', reason: 'factor_mismatch' });
    return NextResponse.json({ error: 'The two-factor setup is no longer valid. Sign in again.' }, { status: 400 });
  }

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify(parsed.data);
  if (verifyError) {
    securityLog('admin_mfa_rejected', { requestId, route: '/api/admin/mfa/verify', reason: 'invalid_code' });
    return NextResponse.json({ error: 'That code is invalid or expired. Try the current code.' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
    });
  }

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.currentLevel !== 'aal2') {
    return NextResponse.json({ error: 'Two-factor verification did not complete.' }, { status: 401 });
  }
  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
  });
}
