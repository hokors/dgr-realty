import { createClient } from '@supabase/supabase-js';
import { sampleProperties } from '@/data/sample-properties';
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
  const images: PropertyImage[] = [...(row.property_images ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((item) => ({
      id: item.id,
      imageUrl: item.image_url,
      displayOrder: item.display_order,
      altText: item.alt_text ?? undefined,
    }));

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    category: row.property_categories?.name ?? 'Uncategorized',
    listingType: row.listing_type,
    price: Number(row.price),
    priceSuffix: row.price_suffix ?? undefined,
    location: row.location,
    city: row.city,
    province: row.province,
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

class PropertyDataUnavailableError extends Error {}

function developmentFallbackOrThrow<T>(logMessage: string, fallback: T): T {
  console.error(logMessage);
  if (!sampleDataEnabled) {
    throw new PropertyDataUnavailableError('Property data is currently unavailable.');
  }
  return fallback;
}

export async function getProperties(): Promise<Property[]> {
  const client = publicClient();
  if (!client) {
    return developmentFallbackOrThrow(
      'Supabase property configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      sampleProperties,
    );
  }

  try {
    const { data, error } = await client
      .from('properties')
      .select(propertySelect)
      .eq('publication_status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      return developmentFallbackOrThrow(`Unable to load Supabase properties: ${error.message}`, sampleProperties);
    }

    return (data as unknown as DatabaseProperty[]).map(mapProperty);
  } catch (error) {
    if (error instanceof PropertyDataUnavailableError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return developmentFallbackOrThrow(`Unable to load Supabase properties: ${message}`, sampleProperties);
  }
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  const client = publicClient();
  const developmentProperty = sampleProperties.find((property) => property.slug === slug) ?? null;
  if (!client) {
    return developmentFallbackOrThrow(
      'Supabase property configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      developmentProperty,
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
      return developmentFallbackOrThrow(`Unable to load Supabase property: ${error.message}`, developmentProperty);
    }

    return data ? mapProperty(data as unknown as DatabaseProperty) : null;
  } catch (error) {
    if (error instanceof PropertyDataUnavailableError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return developmentFallbackOrThrow(`Unable to load Supabase property: ${message}`, developmentProperty);
  }
}
