import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { sampleProperties } from '@/data/sample-properties';
import { getAbsoluteUrl } from '@/lib/site-url';
import { normalizePropertyContent } from '@/lib/property-quality';
import type { Property, PropertyImage } from '@/lib/types';

type DatabaseProperty = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  listing_type: 'For Sale' | 'For Rent';
  price: number;
  price_suffix: string | null;
  location: string;
  city: string;
  province: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  lot_area: number | null;
  floor_area: number | null;
  status: Property['status'];
  featured: boolean;
  created_at: string;
  updated_at: string;
  property_categories: { name: string } | null;
  property_images: Array<{
    id: string;
    image_url: string;
    display_order: number;
    alt_text: string | null;
  }>;
  property_amenities: Array<{ amenities: { name: string } | null }>;
};

function mapProperty(row: DatabaseProperty): Property {
  const content = normalizePropertyContent({
    title: row.title,
    description: row.description ?? '',
    listingType: row.listing_type,
    priceSuffix: row.price_suffix,
    location: row.location,
    city: row.city,
    province: row.province,
  });
  const images: PropertyImage[] = [...(row.property_images ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((item) => ({
      id: item.id,
      imageUrl: getAbsoluteUrl(`/api/property-images/${item.id}`),
      displayOrder: item.display_order,
      altText: item.alt_text ?? undefined,
    }));

  return {
    id: row.id,
    title: content.title,
    slug: row.slug,
    description: content.description,
    category: row.property_categories?.name ?? 'Uncategorized',
    listingType: row.listing_type,
    price: Number(row.price),
    priceSuffix: content.priceSuffix ?? undefined,
    location: content.location,
    city: content.city,
    province: content.province,
    showMap: false,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    parkingSpaces: row.parking_spaces ?? undefined,
    lotArea: row.lot_area ? Number(row.lot_area) : undefined,
    floorArea: row.floor_area ? Number(row.floor_area) : undefined,
    status: row.status,
    featured: row.featured,
    amenities: (row.property_amenities ?? [])
      .map((item) => item.amenities?.name)
      .filter((name): name is string => Boolean(name)),
    images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

const propertySelect = `
  id,
  title,
  slug,
  description,
  listing_type,
  price,
  price_suffix,
  location,
  city,
  province,
  bedrooms,
  bathrooms,
  parking_spaces,
  lot_area,
  floor_area,
  status,
  featured,
  created_at,
  updated_at,
  property_categories(name),
  property_images(id, image_url, display_order, alt_text),
  property_amenities(amenities(name))
`;

const sampleDataEnabled = process.env.NODE_ENV === 'development';

function publicReadFallback<T>(
  context: string,
  developmentFallback: T,
  productionFallback: T,
  error?: unknown,
): T {
  const errorCode = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
    : undefined;
  console.error(context, errorCode ? { errorCode } : undefined);
  return sampleDataEnabled ? developmentFallback : productionFallback;
}

export async function getProperties(): Promise<Property[]> {
  const client = publicClient();
  if (!client) {
    return publicReadFallback(
      'Supabase property configuration is missing.',
      sampleProperties,
      [],
    );
  }

  try {
    const { data, error } = await client
      .from('properties')
      .select(propertySelect)
      .eq('publication_status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      return publicReadFallback('Unable to load Supabase properties.', sampleProperties, [], error);
    }

    return (data as unknown as DatabaseProperty[]).map(mapProperty);
  } catch (error) {
    return publicReadFallback('Unable to load Supabase properties.', sampleProperties, [], error);
  }
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  const client = publicClient();
  const developmentProperty = sampleProperties.find((property) => property.slug === slug) ?? null;
  if (!client) {
    return publicReadFallback(
      'Supabase property configuration is missing.',
      developmentProperty,
      null,
    );
  }

  try {
    const { data, error } = await client
      .from('properties')
      .select(propertySelect)
      .eq('slug', slug)
      .eq('publication_status', 'published')
      .maybeSingle();

    if (error) {
      return publicReadFallback('Unable to load Supabase property.', developmentProperty, null, error);
    }

    if (!data) return null;

    const property = mapProperty(data as unknown as DatabaseProperty);
    const { data: mapRows, error: mapError } = await client.rpc('get_public_property_map_location', {
      p_property_id: property.id,
    });
    if (mapError) {
      console.error('Unable to load the public property map location.', { errorCode: mapError.code });
      return property;
    }
    const mapConfig = (mapRows as Array<{ map_location: string | null }> | null)?.[0];
    return mapConfig
      ? { ...property, mapLocation: mapConfig.map_location ?? undefined, showMap: true }
      : property;
  } catch (error) {
    return publicReadFallback('Unable to load Supabase property.', developmentProperty, null, error);
  }
}
