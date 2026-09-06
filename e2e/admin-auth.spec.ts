import { expect, test } from '@playwright/test';

const testAdminEmail = process.env.E2E_ADMIN_EMAIL;
const testAdminPassword = process.env.E2E_ADMIN_PASSWORD;

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
        [`/api/admin/inquiries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
        ['/api/admin/logout', { method: 'POST' }],
      ];
      return Promise.all(requests.map(async ([url, init]) => (await fetch(url, init)).status));
    });

    expect(statuses).toEqual([401, 401, 401, 401, 401, 401, 401]);
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

  test('an admin can log in, reach protected actions, and log out', async ({ page }) => {
    test.skip(!testAdminEmail || !testAdminPassword, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the live admin flow.');

    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill(testAdminEmail!);
    await page.getByLabel('Password').fill(testAdminPassword!);
    await page.getByRole('button', { name: 'Sign in securely' }).click();
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
