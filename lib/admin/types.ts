import type { ListingType, PropertyPublicationStatus, PropertyStatus } from '@/lib/types';

export type AdminCategory = {
  id: string;
  name: string;
};

export type AdminImage = {
  id: string;
  image_url: string;
  storage_path: string | null;
  alt_text: string | null;
  display_order: number;
};

export type AdminProperty = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category_id: string;
  listing_type: ListingType;
  price: number;
  price_suffix: string | null;
  location: string;
  city: string;
  province: string;
  map_location: string | null;
  show_map: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  lot_area: number | null;
  floor_area: number | null;
  status: PropertyStatus;
  featured: boolean;
  publication_status: PropertyPublicationStatus;
  created_at: string;
  updated_at: string;
  property_categories?: { name: string } | null;
  property_images: AdminImage[];
  property_amenities: Array<{ amenities: { name: string } | null }>;
};

export const adminCategories = [
  'House',
  'Condominium',
  'Lot',
  'Raw Land',
  'Rentals',
  'Commercial',
  'Farm Lot',
] as const;

export const propertyStatuses: PropertyStatus[] = [
  'Available',
  'Reserved',
  'Sold',
  'Rented',
  'Under Negotiation',
];

export const propertyPublicationStatuses: PropertyPublicationStatus[] = ['draft', 'published', 'archived'];
