import { expect, test } from '@playwright/test';
import { createHmac } from 'node:crypto';

const testAdminEmail = process.env.E2E_ADMIN_EMAIL;
const testAdminPassword = process.env.E2E_ADMIN_PASSWORD;
const testAdminTotpSecret = process.env.E2E_ADMIN_TOTP_SECRET;

function totpCode(secret: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const character of normalized) bits += alphabet.indexOf(character).toString(2).padStart(5, '0');
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac('sha1', key).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return number.toString().padStart(6, '0');
}

test.describe('admin authorization', () => {
  test('logged-out visitors are redirected to the admin login', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    await expect(page.getByRole('heading', { name: 'Administrator login' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  });

  test('admin property routes are protected too', async ({ page }) => {
    await page.goto('/admin/properties/new', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    await expect(page.getByRole('heading', { name: 'Administrator login' })).toBeVisible();
  });

  test('all admin mutation endpoints reject logged-out callers', async ({ page }) => {
    await page.goto('/');
    const statuses = await page.evaluate(async () => {
      const id = '00000000-0000-4000-8000-000000000001';
      const requests: Array<[string, RequestInit]> = [
        ['/api/admin/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
        [`/api/admin/properties/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
        [`/api/admin/properties/${id}`, { method: 'DELETE' }],
        ['/api/admin/property-images/stage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
        ['/api/admin/property-images/stage', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
        ['/api/admin/mfa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
        [`/api/admin/inquiries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
        ['/api/admin/logout', { method: 'POST' }],
      ];
      return Promise.all(requests.map(async ([url, init]) => (await fetch(url, init)).status));
    });

    expect(statuses).toEqual([401, 401, 401, 401, 401, 401, 401, 401]);
  });

  test('invalid login is rejected without creating a session', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill('not-an-admin@example.com');
    await page.getByLabel('Password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign in securely' }).click();

    await expect(page.locator('form [role="alert"]')).toContainText(/invalid email address or password|temporarily unavailable/i);
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
  });

  test('first-time login presents authenticator enrollment and submits the code', async ({ page }) => {
    const factorId = '00000000-0000-4000-8000-000000000002';
    await page.route('**/api/admin/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mfaEnrollmentRequired: true,
          factorId,
          qrCode: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
          secret: 'JBSWY3DPEHPK3PXP',
        }),
      });
    });
    await page.route('**/api/admin/mfa/verify', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill('admin@example.com');
    await page.getByLabel('Password').fill('example-password');
    await page.getByRole('button', { name: 'Sign in securely' }).click();
    await expect(page.getByRole('heading', { name: 'Secure your account' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Authenticator setup QR code' })).toBeVisible();
    await expect(page.getByText('JBSWY3DPEHPK3PXP')).toBeVisible();

    await page.getByLabel('Six-digit code').fill('123456');
    const verification = page.waitForRequest('**/api/admin/mfa/verify');
    await page.getByRole('button', { name: 'Verify and continue' }).click();
    expect((await verification).postDataJSON()).toEqual({ factorId, code: '123456' });
  });

  test('returning admins must complete the authenticator challenge', async ({ page }) => {
    const factorId = '00000000-0000-4000-8000-000000000003';
    await page.route('**/api/admin/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mfaRequired: true, factorId }),
      });
    });
    await page.route('**/api/admin/mfa/verify', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'That code is invalid or expired. Try the current code.' }),
      });
    });

    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill('admin@example.com');
    await page.getByLabel('Password').fill('example-password');
    await page.getByRole('button', { name: 'Sign in securely' }).click();

    await expect(page.getByRole('heading', { name: 'Enter your security code' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Authenticator setup QR code' })).toHaveCount(0);
    await page.getByLabel('Six-digit code').fill('000000');
    await page.getByRole('button', { name: 'Verify and continue' }).click();
    await expect(page.locator('form [role="alert"]')).toContainText('invalid or expired');
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
  });

  test('an admin can log in, reach protected actions, and log out', async ({ page }) => {
    test.skip(!testAdminEmail || !testAdminPassword, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the live admin flow.');

    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill(testAdminEmail!);
    await page.getByLabel('Password').fill(testAdminPassword!);
    await page.getByRole('button', { name: 'Sign in securely' }).click();
    await expect(page.getByLabel('Six-digit code')).toBeVisible();

    const enrollmentSecret = await page.locator('code').textContent().catch(() => null);
    const secret = enrollmentSecret?.trim() || testAdminTotpSecret;
    test.skip(!secret, 'Set E2E_ADMIN_TOTP_SECRET when the test account already has MFA enrolled.');
    await page.getByLabel('Six-digit code').fill(totpCode(secret!));
    await page.getByRole('button', { name: 'Verify and continue' }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    const actionStatus = await page.evaluate(async () => {
      const response = await fetch('/api/admin/property-images/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      return response.status;
    });
    expect(actionStatus).toBe(400);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    await page.goto('/admin/properties');
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
  });
});
