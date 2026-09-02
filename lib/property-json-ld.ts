import type { Property } from '@/lib/types';
import { getAbsoluteUrl } from '@/lib/site-url';

function propertySchemaType(category: string) {
  if (category === 'House') return 'SingleFamilyResidence';
  if (category === 'Condominium') return 'Apartment';
  if (category === 'Rentals') return 'Accommodation';
  return 'Place';
}

function offerAvailability(status: Property['status']) {
  if (status === 'Available') return 'https://schema.org/InStock';
  if (status === 'Reserved' || status === 'Under Negotiation') return 'https://schema.org/LimitedAvailability';
  return 'https://schema.org/OutOfStock';
}

export function createPropertyJsonLd(property: Property) {
  const url = getAbsoluteUrl(`/properties/${encodeURIComponent(property.slug)}`);
  const propertyId = `${url}#property`;
  const breadcrumbId = `${url}#breadcrumb`;
  const schemaType = propertySchemaType(property.category);
  const images = property.images.map((image) => image.imageUrl);
  const additionalProperty = [
    property.lotArea != null ? { '@type': 'PropertyValue', name: 'Lot area', value: property.lotArea, unitCode: 'MTK' } : null,
    property.floorArea != null && schemaType === 'Place' ? { '@type': 'PropertyValue', name: 'Floor area', value: property.floorArea, unitCode: 'MTK' } : null,
    property.bathrooms != null && !Number.isInteger(property.bathrooms) ? { '@type': 'PropertyValue', name: 'Bathrooms', value: property.bathrooms } : null,
    property.parkingSpaces != null ? { '@type': 'PropertyValue', name: 'Parking spaces', value: property.parkingSpaces } : null,
    { '@type': 'PropertyValue', name: 'Listing type', value: property.listingType },
    { '@type': 'PropertyValue', name: 'Property status', value: property.status },
  ].filter(Boolean);

  const listedProperty: Record<string, unknown> = {
    '@type': schemaType,
    '@id': propertyId,
    name: property.title,
    description: property.description,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.location,
      addressLocality: property.city,
      addressRegion: property.province,
      addressCountry: 'PH',
    },
    additionalProperty,
    amenityFeature: property.amenities.map((amenity) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity,
      value: true,
    })),
  };

  if (schemaType !== 'Place') listedProperty.accommodationCategory = property.category;
  if (images.length > 0) listedProperty.image = images;
  if (property.bedrooms != null) listedProperty.numberOfBedrooms = property.bedrooms;
  if (property.bathrooms != null && Number.isInteger(property.bathrooms)) listedProperty.numberOfBathroomsTotal = property.bathrooms;
  if (property.floorArea != null && schemaType !== 'Place') {
    listedProperty.floorSize = { '@type': 'QuantitativeValue', value: property.floorArea, unitCode: 'MTK' };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'RealEstateListing',
        '@id': `${url}#listing`,
        url,
        name: property.title,
        description: property.description,
        datePosted: property.createdAt,
        dateModified: property.updatedAt,
        primaryImageOfPage: images[0] ? { '@type': 'ImageObject', url: images[0] } : undefined,
        breadcrumb: { '@id': breadcrumbId },
        mainEntity: {
          '@type': 'Offer',
          url,
          price: property.price,
          priceCurrency: 'PHP',
          availability: offerAvailability(property.status),
          businessFunction: property.listingType === 'For Rent'
            ? 'http://purl.org/goodrelations/v1#LeaseOut'
            : 'http://purl.org/goodrelations/v1#Sell',
          itemOffered: { '@id': propertyId },
        },
      },
      listedProperty,
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Properties', item: getAbsoluteUrl('/properties') },
          { '@type': 'ListItem', position: 2, name: property.category, item: getAbsoluteUrl(`/properties?category=${encodeURIComponent(property.category)}`) },
          { '@type': 'ListItem', position: 3, name: property.title, item: url },
        ],
      },
    ],
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
