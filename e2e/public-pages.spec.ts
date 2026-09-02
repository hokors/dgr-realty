import { expect, test } from '@playwright/test';

test.describe('public website', () => {
  test('homepage presents the main search and inquiry paths', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/DGR Realty/i);
    await expect(page.getByRole('heading', { name: 'Find your next property.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'DGR Realty home' })).toBeVisible();
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send inquiry' })).toBeVisible();
    await expect(page.getByRole('checkbox')).toBeVisible();
  });

  test('property search and filters respond to user input', async ({ page }) => {
    const response = await page.goto('/properties', { waitUntil: 'domcontentloaded' });

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: 'Browse available properties' })).toBeVisible();

    const moreFilters = page.getByRole('button', { name: /more filters/i });
    await moreFilters.click();
    await expect(moreFilters).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('combobox', { name: 'Choose a city' })).toBeVisible();

    const search = page.getByRole('textbox', { name: 'Search properties' });
    await search.fill('e2e-no-matching-property-7f83c');
    await expect(page.getByText('No matching properties yet.')).toBeVisible();

    await page.getByRole('button', { name: 'Reset all filters' }).click();
    await expect(search).toHaveValue('');
  });

  test('mobile navigation remains usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.locator('details.mobile-menu > summary').click();
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Properties', exact: true })).toBeVisible();
  });

  test('unknown property slugs render the public 404 page', async ({ page }) => {
    await page.goto('/properties/e2e-property-that-does-not-exist', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByRole('heading', { name: 'This property is no longer here.' })).toBeVisible();
  });
});

test('a known draft property stays private when a test slug is provided', async ({ page }) => {
  const draftSlug = process.env.E2E_DRAFT_PROPERTY_SLUG;
  test.skip(!draftSlug, 'Set E2E_DRAFT_PROPERTY_SLUG to verify a real draft record.');

  await page.goto(`/properties/${encodeURIComponent(draftSlug!)}`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('heading', { name: 'This property is no longer here.' })).toBeVisible();
});
