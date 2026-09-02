const localSiteUrl = 'http://localhost:3000';

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const candidate = configuredUrl || (productionHost ? `https://${productionHost}` : localSiteUrl);

  try {
    const parsed = new URL(
      candidate.startsWith('http://') || candidate.startsWith('https://')
        ? candidate
        : `https://${candidate}`,
    );
    return new URL(parsed.origin);
  } catch {
    return new URL(localSiteUrl);
  }
}

export function getAbsoluteUrl(path = '/') {
  return new URL(path, getSiteUrl()).toString();
}
