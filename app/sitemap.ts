import type { MetadataRoute } from 'next';
import { getProperties } from '@/lib/properties';
import { getAbsoluteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const properties = await getProperties();

  const staticPages: MetadataRoute.Sitemap = [
    { url: getAbsoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: getAbsoluteUrl('/properties'), changeFrequency: 'daily', priority: 0.9 },
    { url: getAbsoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.2 },
  ];

  const propertyPages: MetadataRoute.Sitemap = properties.map((property) => ({
    url: getAbsoluteUrl(`/properties/${encodeURIComponent(property.slug)}`),
    lastModified: property.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
    images: property.images.map((image) => image.imageUrl),
  }));

  return [...staticPages, ...propertyPages];
}
