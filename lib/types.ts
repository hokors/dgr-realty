export type ListingType = 'For Sale' | 'For Rent';
export type PropertyStatus =
  | 'Available'
  | 'Reserved'
  | 'Sold'
  | 'Rented'
  | 'Under Negotiation';

export type PropertyPublicationStatus = 'draft' | 'published' | 'archived';

export interface PropertyImage {
  id: string;
  imageUrl: string;
  displayOrder: number;
  altText?: string;
}

export interface Property {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  listingType: ListingType;
  price: number;
  priceSuffix?: string;
  location: string;
  city: string;
  province: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  lotArea?: number;
  floorArea?: number;
  status: PropertyStatus;
  featured: boolean;
  amenities: string[];
  images: PropertyImage[];
  createdAt: string;
  updatedAt: string;
}
