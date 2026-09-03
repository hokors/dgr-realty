import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeRateLimitResult, type RateLimitResult } from '@/lib/security/rate-limit-result';

export class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 413 | 415, message: string) {
    super(message);
  }
}

export async function readJsonBody(request: Request, maximumBytes: number): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') throw new RequestBodyError(415, 'A JSON request body is required.');

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestBodyError(413, 'The request is too large.');
  }

  if (!request.body) throw new RequestBodyError(400, 'The request body is missing.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new RequestBodyError(413, 'The request is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new RequestBodyError(400, 'The JSON request body is invalid.');
  }
}

function configuredOrigins() {
  const origins = new Set<string>();
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      origins.add(new URL(candidate.includes('://') ? candidate : `https://${candidate}`).origin);
    } catch {
      // Invalid configuration is ignored; the request URL remains authoritative.
    }
  }
  return origins;
}

export function hasTrustedMutationOrigin(request: Request) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return false;

  const origin = request.headers.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';
  try {
    const allowed = configuredOrigins();
    const requestUrl = new URL(request.url);
    allowed.add(requestUrl.origin);
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',', 1)[0].trim();
    const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https'
      ? `${forwardedProtocol}:`
      : requestUrl.protocol;
    for (const hostHeader of [request.headers.get('host')]) {
      const host = hostHeader?.split(',', 1)[0].trim();
      if (host) allowed.add(new URL(`${protocol}//${host}`).origin);
    }
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  return forwarded.split(',', 1)[0].trim().slice(0, 80) || 'unknown';
}

function rateLimitSalt() {
  return process.env.SECURITY_RATE_LIMIT_SALT ?? process.env.INQUIRY_RATE_LIMIT_SALT ?? null;
}

export function hashRateLimitIdentifier(identifier: string) {
  const salt = rateLimitSalt();
  if (!salt && process.env.NODE_ENV === 'production') return null;
  return createHash('sha256').update(`${salt ?? 'local-development'}|${identifier}`).digest('hex');
}

type RateLimitOptions = {
  bucket: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

export async function consumeRateLimit(supabase: SupabaseClient, options: RateLimitOptions): Promise<RateLimitResult> {
  const identifierHash = hashRateLimitIdentifier(options.identifier);
  if (!identifierHash) return { allowed: false, retryAfter: 60, unavailable: true };

  const { data, error } = await supabase.rpc('consume_request_rate_limit', {
    p_bucket: options.bucket,
    p_identifier_hash: identifierHash,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });
  return normalizeRateLimitResult(data, Boolean(error), options.windowSeconds);
}

type SecurityLogDetails = {
  requestId?: string;
  route?: string;
  reason?: string;
  actorHash?: string | null;
  errorCode?: string | null;
};

function safeLogValue(value: string | null | undefined, maximum = 120) {
  return value ? value.replace(/[^a-zA-Z0-9_./:-]/g, '_').slice(0, maximum) : undefined;
}

export function securityLog(event: string, details: SecurityLogDetails = {}) {
  console.warn(JSON.stringify({
    level: 'security',
    event: safeLogValue(event, 80),
    requestId: safeLogValue(details.requestId, 64),
    route: safeLogValue(details.route, 160),
    reason: safeLogValue(details.reason, 120),
    actorHash: safeLogValue(details.actorHash, 64),
    errorCode: safeLogValue(details.errorCode, 40),
    timestamp: new Date().toISOString(),
  }));
}

export function createRequestId() {
  return randomUUID();
}

export function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}
