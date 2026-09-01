import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, getAdminSupabaseConfigStatus } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type InquiryPayload = {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  interest?: unknown;
  preferredLocation?: unknown;
  message?: unknown;
  propertyId?: unknown;
  propertyTitle?: unknown;
  source?: unknown;
  consent?: unknown;
  website?: unknown;
  startedAt?: unknown;
  turnstileToken?: unknown;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function verifyTurnstile(token: string, ipAddress: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!token) return false;

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
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean; action?: string };
  return result.success === true && result.action === 'inquiry';
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  return forwarded.split(',')[0].trim();
}

export async function POST(request: Request) {
  let payload: InquiryPayload;
  try {
    payload = await request.json() as InquiryPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid inquiry request.' }, { status: 400 });
  }

  // Honeypot submissions are quietly absorbed so bots receive no useful signal.
  const website = clean(payload.website, 200);
  const startedAt = Number(payload.startedAt);
  if (website) return NextResponse.json({ success: true });
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 1800) return NextResponse.json({ error: 'Please wait a moment and try again.' }, { status: 400 });

  const fullName = clean(payload.fullName, 120);
  const email = clean(payload.email, 254).toLowerCase();
  const phone = clean(payload.phone, 40);
  const interest = clean(payload.interest, 120);
  const preferredLocation = clean(payload.preferredLocation, 160);
  const message = clean(payload.message, 3000);
  const requestedPropertyId = clean(payload.propertyId, 36);
  const requestedPropertyTitle = clean(payload.propertyTitle, 200);
  const source = payload.source === 'property' ? 'property' : 'homepage';
  const consent = payload.consent === true;

  if (fullName.length < 2 || !isEmail(email) || message.length < 10 || !consent) {
    return NextResponse.json({ error: 'Please complete the required fields and accept the privacy notice.' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    const config = getAdminSupabaseConfigStatus();
    const missing = [
      !config.hasUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
      !config.hasSecret ? 'SUPABASE_SECRET_KEY' : null,
    ].filter(Boolean);
    console.error('Inquiry service configuration is incomplete.', { missing });
    return NextResponse.json({ error: `This deployment is missing ${missing.join(' and ')}.` }, { status: 503 });
  }

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const fingerprintSalt = process.env.INQUIRY_RATE_LIMIT_SALT
    ?? process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? 'local-development';
  const fingerprint = createHash('sha256').update(`${fingerprintSalt}|${ipAddress}|${userAgent}`).digest('hex');
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error: rateError } = await supabase
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('request_fingerprint', fingerprint)
    .gte('created_at', fifteenMinutesAgo);

  if (rateError) return NextResponse.json({ error: 'Inquiry service is temporarily unavailable.' }, { status: 503 });
  if ((count ?? 0) >= 4) return NextResponse.json({ error: 'Too many inquiries. Please wait a few minutes and try again.' }, { status: 429 });

  const turnstileToken = clean(payload.turnstileToken, 2048);
  const turnstileVerified = await verifyTurnstile(turnstileToken, ipAddress);
  if (!turnstileVerified) {
    return NextResponse.json({ error: 'Please complete the spam-protection check and try again.' }, { status: 400 });
  }

  let propertyId: string | null = isUuid(requestedPropertyId) ? requestedPropertyId : null;
  let propertyTitle = requestedPropertyTitle || null;
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

  const { data: inquiry, error: insertError } = await supabase
    .from('inquiries')
    .insert({
      property_id: propertyId,
      property_title: propertyTitle,
      full_name: fullName,
      email,
      phone: phone || null,
      interest: interest || null,
      preferred_location: preferredLocation || null,
      message,
      source,
      privacy_consent: true,
      turnstile_verified: turnstileVerified,
      request_fingerprint: fingerprint,
      notification_status: resendConfigured ? 'pending' : 'not_configured',
    })
    .select('id')
    .single();

  if (insertError || !inquiry) {
    return NextResponse.json({ error: 'We could not save your inquiry. Please try again.' }, { status: 500 });
  }

  if (resendConfigured) {
    const emailLines = [
      `New DGR Realty inquiry from ${fullName}`,
      '',
      `Email: ${email}`,
      `Phone: ${phone || 'Not provided'}`,
      `Interest: ${interest || 'Not specified'}`,
      `Preferred location: ${preferredLocation || 'Not specified'}`,
      `Property: ${propertyTitle || 'General inquiry'}`,
      `Source: ${source}`,
      '',
      'Message:',
      message,
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
          reply_to: email,
          subject: propertyTitle ? `Property inquiry: ${propertyTitle}` : `New inquiry from ${fullName}`,
          text: emailLines.join('\n'),
        }),
        cache: 'no-store',
      });
      notificationStatus = emailResponse.ok ? 'sent' : 'failed';
    } catch {
      // The lead is already safely stored. A notification outage must not make
      // visitors resubmit and create duplicate leads.
    }

    await supabase.from('inquiries').update({ notification_status: notificationStatus }).eq('id', inquiry.id);
  }

  return NextResponse.json({ success: true });
}
