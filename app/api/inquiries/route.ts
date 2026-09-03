import { randomUUID } from 'node:crypto';
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
import { inquirySchema } from '@/lib/security/validation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function verifyTurnstile(token: string, ipAddress: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!secret && !siteKey) return true;
  if (!secret || !siteKey || !token) return false;

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      remoteip: ipAddress,
      idempotency_key: randomUUID(),
    });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean; action?: string };
    return result.success === true && result.action === 'inquiry';
  } catch {
    return false;
  }
}

function tooManyRequests(retryAfter: number, requestId: string) {
  return NextResponse.json({ error: 'Too many inquiries. Please wait a few minutes and try again.' }, {
    status: 429,
    headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter), 'X-Request-ID': requestId },
  });
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  if (!hasTrustedMutationOrigin(request)) {
    securityLog('inquiry_origin_rejected', { requestId, route: '/api/inquiries' });
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  let untrustedBody: unknown;
  try {
    untrustedBody = await readJsonBody(request, 16 * 1024);
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : 'Invalid inquiry request.' }, {
      status: error instanceof RequestBodyError ? error.status : 400,
    });
  }

  // Quietly accept the hidden honeypot so automated senders learn nothing.
  if (
    untrustedBody
    && typeof untrustedBody === 'object'
    && 'website' in untrustedBody
    && typeof untrustedBody.website === 'string'
    && untrustedBody.website.trim()
  ) {
    securityLog('inquiry_honeypot_triggered', { requestId, route: '/api/inquiries' });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const parsed = inquirySchema.safeParse(untrustedBody);
  if (!parsed.success) {
    securityLog('inquiry_input_rejected', { requestId, route: '/api/inquiries', reason: 'schema_validation' });
    return NextResponse.json({ error: 'Please complete the required fields and accept the privacy notice.' }, { status: 400 });
  }
  const payload = parsed.data;
  const elapsed = Date.now() - payload.startedAt;
  if (elapsed < 1_800 || elapsed > 24 * 60 * 60 * 1_000) {
    securityLog('inquiry_input_rejected', { requestId, route: '/api/inquiries', reason: 'submission_timing' });
    return NextResponse.json({ error: 'Please refresh the page and try again.' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    securityLog('inquiry_service_unavailable', { requestId, route: '/api/inquiries', reason: 'server_configuration' });
    return NextResponse.json({ error: 'Inquiry service is temporarily unavailable.' }, { status: 503 });
  }

  const ipAddress = getClientIp(request);
  const userAgent = (request.headers.get('user-agent') ?? 'unknown').slice(0, 300);
  const visitorIdentifier = `${ipAddress}|${userAgent}`;
  const visitorLimit = await consumeRateLimit(supabase, {
    bucket: 'public:inquiry:visitor',
    identifier: visitorIdentifier,
    limit: 4,
    windowSeconds: 15 * 60,
  });
  if (visitorLimit.unavailable) {
    securityLog('rate_limit_unavailable', { requestId, route: '/api/inquiries', reason: 'inquiry_visitor' });
    return NextResponse.json({ error: 'Inquiry service is temporarily unavailable.' }, { status: 503 });
  }
  if (!visitorLimit.allowed) {
    securityLog('rate_limit_exceeded', { requestId, route: '/api/inquiries', reason: 'inquiry_visitor' });
    return tooManyRequests(visitorLimit.retryAfter, requestId);
  }

  const emailLimit = await consumeRateLimit(supabase, {
    bucket: 'public:inquiry:email',
    identifier: payload.email,
    limit: 6,
    windowSeconds: 60 * 60,
  });
  if (emailLimit.unavailable) {
    securityLog('rate_limit_unavailable', { requestId, route: '/api/inquiries', reason: 'inquiry_email' });
    return NextResponse.json({ error: 'Inquiry service is temporarily unavailable.' }, { status: 503 });
  }
  if (!emailLimit.allowed) {
    securityLog('rate_limit_exceeded', {
      requestId,
      route: '/api/inquiries',
      reason: 'inquiry_email',
      actorHash: hashRateLimitIdentifier(payload.email),
    });
    return tooManyRequests(emailLimit.retryAfter, requestId);
  }

  const turnstileVerified = await verifyTurnstile(payload.turnstileToken, ipAddress);
  if (!turnstileVerified) {
    securityLog('inquiry_spam_check_failed', { requestId, route: '/api/inquiries' });
    return NextResponse.json({ error: 'Please complete the spam-protection check and try again.' }, { status: 400 });
  }

  let propertyId: string | null = payload.propertyId ?? null;
  let propertyTitle: string | null = null;
  if (propertyId) {
    const { data: property } = await supabase
      .from('properties')
      .select('id, title')
      .eq('id', propertyId)
      .eq('publication_status', 'published')
      .maybeSingle();
    if (property) propertyTitle = property.title;
    else propertyId = null;
  }

  const resendConfigured = Boolean(
    process.env.RESEND_API_KEY
    && process.env.INQUIRY_NOTIFICATION_EMAIL
    && process.env.INQUIRY_FROM_EMAIL,
  );
  const fingerprint = hashRateLimitIdentifier(visitorIdentifier);
  if (!fingerprint) return NextResponse.json({ error: 'Inquiry service is temporarily unavailable.' }, { status: 503 });

  const { data: inquiry, error: insertError } = await supabase
    .from('inquiries')
    .insert({
      property_id: propertyId,
      property_title: propertyTitle,
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone || null,
      interest: payload.interest || null,
      preferred_location: payload.preferredLocation || null,
      message: payload.message,
      source: payload.source,
      privacy_consent: true,
      turnstile_verified: turnstileVerified,
      request_fingerprint: fingerprint,
      notification_status: resendConfigured ? 'pending' : 'not_configured',
    })
    .select('id')
    .single();

  if (insertError || !inquiry) {
    securityLog('inquiry_save_failed', { requestId, route: '/api/inquiries', reason: 'database_insert' });
    return NextResponse.json({ error: 'We could not save your inquiry. Please try again.' }, { status: 500 });
  }

  if (resendConfigured) {
    const emailLines = [
      `New DGR Realty inquiry from ${payload.fullName}`,
      '',
      `Email: ${payload.email}`,
      `Phone: ${payload.phone || 'Not provided'}`,
      `Interest: ${payload.interest || 'Not specified'}`,
      `Preferred location: ${payload.preferredLocation || 'Not specified'}`,
      `Property: ${propertyTitle || 'General inquiry'}`,
      `Source: ${payload.source}`,
      '',
      'Message:',
      payload.message,
      '',
      `Lead ID: ${inquiry.id}`,
    ];

    let notificationStatus = 'failed';
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `inquiry-${inquiry.id}`,
        },
        body: JSON.stringify({
          from: process.env.INQUIRY_FROM_EMAIL,
          to: [process.env.INQUIRY_NOTIFICATION_EMAIL],
          reply_to: payload.email,
          subject: propertyTitle ? `Property inquiry: ${propertyTitle}` : `New inquiry from ${payload.fullName}`,
          text: emailLines.join('\n'),
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      notificationStatus = emailResponse.ok ? 'sent' : 'failed';
    } catch {
      // The lead is stored before notification, so a mail outage never causes duplicates.
    }

    await supabase.from('inquiries').update({ notification_status: notificationStatus }).eq('id', inquiry.id);
  }

  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
  });
}
