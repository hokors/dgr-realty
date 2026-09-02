import { expect, test } from '@playwright/test';

test.describe('search engine endpoints', () => {
  test('robots.txt protects private routes and links the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const body = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('text/plain');
    expect(body).toContain('User-Agent: *');
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Disallow: /api');
    expect(body).toContain('/sitemap.xml');
  });

  test('sitemap.xml contains the primary public pages', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    const body = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/xml');
    expect(body).toContain('<urlset');
    expect(body).toContain('<loc>');
    expect(body).toContain('/properties</loc>');
    expect(body).toContain('/privacy</loc>');
  });
});
