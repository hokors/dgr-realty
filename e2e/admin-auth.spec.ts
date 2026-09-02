import { expect, test } from '@playwright/test';

test.describe('admin authorization', () => {
  test('logged-out visitors are redirected to the admin login', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    await expect(page.getByRole('heading', { name: 'Administrator login' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('admin property routes are protected too', async ({ page }) => {
    await page.goto('/admin/properties/new', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    await expect(page.getByRole('heading', { name: 'Administrator login' })).toBeVisible();
  });
});
