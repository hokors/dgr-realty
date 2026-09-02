const shortGoogleMapsHosts = new Set(['maps.app.goo.gl', 'goo.gl']);

function isGoogleMapsHost(hostname: string) {
  const host = hostname.toLowerCase();
  return shortGoogleMapsHosts.has(host)
    || host === 'google.com'
    || host.endsWith('.google.com')
    || /(^|\.)google\.(com\.)?[a-z]{2,3}$/.test(host)
    || /(^|\.)google\.co\.[a-z]{2}$/.test(host);
}

function decodeMapValue(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' ')).trim();
  } catch {
    return value.replace(/\+/g, ' ').trim();
  }
}

function queryFromGoogleMapsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!isGoogleMapsHost(url.hostname)) throw new Error('Use a Google Maps link or enter a place/address.');

  for (const parameter of ['query', 'q', 'destination', 'center', 'll']) {
    const query = url.searchParams.get(parameter)?.trim();
    if (query) return query;
  }

  const placeMatch = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/i);
  if (placeMatch?.[1]) return decodeMapValue(placeMatch[1]);

  const coordinateMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (coordinateMatch) return `${coordinateMatch[1]},${coordinateMatch[2]}`;
  return null;
}

export async function normalizeGoogleMapsLocation(value: string) {
  const input = value.trim();
  if (!input) return '';
  if (!/^https?:\/\//i.test(input)) return input;

  const directQuery = queryFromGoogleMapsUrl(input);
  if (directQuery) return directQuery.slice(0, 2048);

  const inputUrl = new URL(input);
  if (!shortGoogleMapsHosts.has(inputUrl.hostname.toLowerCase())) {
    throw new Error('This Google Maps link does not contain a recognizable place. Paste the full place link or enter the place/address instead.');
  }

  try {
    const response = await fetch(input, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const resolvedQuery = queryFromGoogleMapsUrl(response.url);
    await response.body?.cancel();
    if (resolvedQuery) return resolvedQuery.slice(0, 2048);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Use a Google Maps link')) throw error;
  }

  throw new Error('The shortened Google Maps link could not be resolved. Paste the full link or enter the place/address instead.');
}
