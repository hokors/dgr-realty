import { expect, test } from '@playwright/test';
import { hasValidImageSignature } from '../lib/security/image-signatures';
import { normalizeRateLimitResult } from '../lib/security/rate-limit-result';
import { imageStageSchema, inquirySchema, propertyQuickUpdateSchema } from '../lib/security/validation';

test.describe('security controls', () => {
  test('responses include the production security header baseline', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const headers = response.headers();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
  });

  test('cross-site mutation requests are rejected', async ({ request }) => {
    const response = await request.patch('/api/admin/properties/00000000-0000-4000-8000-000000000001', {
      headers: { Origin: 'https://attacker.invalid', 'Sec-Fetch-Site': 'cross-site' },
      data: { featured: true },
    });
    expect(response.status()).toBe(403);
  });

  test('unauthenticated property mutations are rejected by the server', async ({ page }) => {
    await page.goto('/');
    const status = await page.evaluate(async () => {
      const response = await fetch('/api/admin/properties/00000000-0000-4000-8000-000000000001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: true }),
      });
      return response.status;
    });
    expect(status).toBe(401);
  });

  test('invalid and unexpected inquiry fields are rejected', async ({ page }) => {
    await page.goto('/');
    const status = await page.evaluate(async () => {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'A',
          email: 'not-an-email',
          message: 'short',
          source: 'homepage',
          consent: true,
          website: '',
          startedAt: Date.now() - 2_000,
          unexpectedRole: 'admin',
        }),
      });
      return response.status;
    });
    expect(status).toBe(400);
  });

  test('strict schemas reject extra fields and unsafe upload metadata', () => {
    expect(propertyQuickUpdateSchema.safeParse({ featured: true, created_by: 'attacker' }).success).toBe(false);
    expect(imageStageSchema.safeParse({
      draftId: '00000000-0000-4000-8000-000000000001',
      name: 'payload.svg',
      type: 'image/svg+xml',
      size: 100,
    }).success).toBe(false);
    expect(inquirySchema.safeParse({
      fullName: 'Example Person',
      email: 'person@example.com',
      message: 'Please contact me about this listing.',
      source: 'homepage',
      consent: true,
      website: '',
      startedAt: Date.now() - 2_000,
      role: 'admin',
    }).success).toBe(false);
  });

  test('file signatures reject scripts disguised as images', () => {
    const script = new TextEncoder().encode('<script>alert(1)</script>');
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(hasValidImageSignature(script, 'image/png')).toBe(false);
    expect(hasValidImageSignature(png, 'image/png')).toBe(true);
  });

  test('rate-limit decisions preserve denials and fail closed on backend errors', () => {
    expect(normalizeRateLimitResult([{ allowed: false, retry_after_seconds: 42 }], false, 900)).toEqual({
      allowed: false,
      retryAfter: 42,
      unavailable: false,
    });
    expect(normalizeRateLimitResult(null, true, 900)).toEqual({
      allowed: false,
      retryAfter: 60,
      unavailable: true,
    });
  });
});
