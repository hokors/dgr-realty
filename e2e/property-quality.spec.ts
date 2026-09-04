import { expect, test } from '@playwright/test';
import {
  formatPublicPropertyLocation,
  getPublicationQualityIssues,
  normalizePriceSuffix,
  normalizeProfessionalTitle,
} from '../lib/property-quality';

test.describe('professional listing standards', () => {
  test('normalizes titles, locations, and sale or rent suffixes', () => {
    expect(normalizeProfessionalTitle('Modern Family Home - FOR SALE!!!')).toBe('Modern Family Home');
    expect(formatPublicPropertyLocation('Angeles City, Pampanga', 'angeles city', 'PAMPANGA')).toBe('Angeles City, Pampanga');
    expect(normalizePriceSuffix('For Sale', '/month')).toBeNull();
    expect(normalizePriceSuffix('For Rent', '')).toBe('/month');
  });

  test('blocks incomplete or poorly photographed listings from publication', () => {
    const issues = getPublicationQualityIssues({
      title: 'House',
      description: 'Needs work.',
      listingType: 'For Sale',
      location: 'Pampanga',
      city: '',
      province: 'Pampanga',
      imageCount: 1,
      mainPhotoWidth: 800,
      mainPhotoHeight: 1200,
    });

    expect(issues).toContain('Use a clear property title between 12 and 120 characters.');
    expect(issues).toContain('Add at least 3 property photos before publishing.');
    expect(issues).toContain('Use a landscape-oriented main photo so listing cards crop cleanly.');
  });

  test('accepts a complete publish-ready listing', () => {
    const issues = getPublicationQualityIssues({
      title: 'Contemporary Family Home in Angeles City',
      description: 'This contemporary family home offers generous living areas and a calm residential setting. It is close to daily essentials, key roads, and established communities in Angeles City.',
      listingType: 'For Sale',
      location: 'Pulung Maragul',
      city: 'Angeles City',
      province: 'Pampanga',
      imageCount: 5,
      mainPhotoWidth: 1800,
      mainPhotoHeight: 1200,
      featured: true,
    });

    expect(issues).toEqual([]);
  });
});
