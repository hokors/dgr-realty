import type { ListingType } from '@/lib/types';

export const minimumPublishedPhotos = 3;
export const minimumFeaturedPhotos = 5;
export const minimumPhotoLongEdge = 1200;
export const minimumPhotoShortEdge = 800;

type PropertyContent = {
  title: string;
  description: string;
  listingType: ListingType;
  priceSuffix?: string | null;
  location: string;
  city: string;
  province: string;
};

type PublicationQualityInput = PropertyContent & {
  featured?: boolean;
  imageCount: number;
  mainPhotoWidth?: number;
  mainPhotoHeight?: number;
};

function inlineText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function upperCaseRatio(value: string) {
  const letters = value.match(/[A-Za-z]/g) ?? [];
  if (letters.length === 0) return 0;
  return letters.filter((letter) => letter === letter.toUpperCase()).length / letters.length;
}

function normalizePlaceName(value: string) {
  const normalized = inlineText(value.replace(/\s*,\s*/g, ', '));
  const letters = normalized.replace(/[^A-Za-z]/g, '');
  if (!letters || (letters !== letters.toLowerCase() && letters !== letters.toUpperCase())) return normalized;

  return normalized.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function locationKey(value: string) {
  return inlineText(value).toLocaleLowerCase('en-PH');
}

export function normalizeProfessionalTitle(value: string) {
  return inlineText(value)
    .replace(/\s*(?:[-\u2013\u2014|,:]\s*)?(?:for\s+(?:sale|rent)|available\s+now)\s*[.!?]*$/i, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[!?]{2,}/g, '!')
    .replace(/!+$/g, '')
    .trim();
}

export function normalizeProfessionalDescription(value: string) {
  const lines = value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => inlineText(line).replace(/^\u00a9\s*/, ''));

  const normalized: string[] = [];
  for (const line of lines) {
    if (!line && normalized.at(-1) === '') continue;
    normalized.push(line);
  }
  return normalized.join('\n').replace(/^\n+|\n+$/g, '');
}

export function normalizePropertyLocation(location: string, city: string, province: string) {
  const normalizedCity = normalizePlaceName(city);
  const normalizedProvince = normalizePlaceName(province);
  const reserved = new Set([locationKey(normalizedCity), locationKey(normalizedProvince)].filter(Boolean));
  const specificParts = location
    .split(/[,\n]/)
    .map(normalizePlaceName)
    .filter((part) => part && !reserved.has(locationKey(part)));
  const deduplicatedSpecificParts = Array.from(new Map(
    specificParts.map((part) => [locationKey(part), part]),
  ).values());

  return {
    location: deduplicatedSpecificParts.join(', ') || normalizedCity,
    city: normalizedCity,
    province: normalizedProvince,
  };
}

export function formatPublicPropertyLocation(location: string, city: string, province: string) {
  const normalized = normalizePropertyLocation(location, city, province);
  return Array.from(new Map(
    [normalized.location, normalized.city, normalized.province]
      .filter(Boolean)
      .map((part) => [locationKey(part), part]),
  ).values()).join(', ');
}

export function normalizePriceSuffix(listingType: ListingType, value?: string | null) {
  if (listingType === 'For Sale') return null;
  const normalized = inlineText(value ?? '').toLowerCase();
  if (!normalized || normalized === 'monthly' || normalized === 'per month' || normalized === '/ month') return '/month';
  return normalized.startsWith('/') ? normalized.replace(/^\/\s+/, '/') : `/${normalized.replace(/^per\s+/, '')}`;
}

export function normalizePropertyContent<T extends PropertyContent>(property: T): T {
  const normalizedLocation = normalizePropertyLocation(property.location, property.city, property.province);
  return {
    ...property,
    title: normalizeProfessionalTitle(property.title),
    description: normalizeProfessionalDescription(property.description),
    priceSuffix: normalizePriceSuffix(property.listingType, property.priceSuffix),
    ...normalizedLocation,
  };
}

export function getPublicationQualityIssues(input: PublicationQualityInput) {
  const normalized = normalizePropertyContent(input);
  const issues: string[] = [];

  if (normalized.title.length < 12 || normalized.title.length > 120) {
    issues.push('Use a clear property title between 12 and 120 characters.');
  }
  if (upperCaseRatio(normalized.title) > 0.65 && normalized.title.replace(/[^A-Za-z]/g, '').length >= 10) {
    issues.push('Use normal title casing instead of writing the property title in all caps.');
  }
  if (/https?:\/\/|www\.|@/.test(normalized.title)) {
    issues.push('Remove links and contact details from the property title.');
  }

  if (normalized.description.length < 120) {
    issues.push('Write a description of at least 120 characters.');
  }
  const sentenceCount = (normalized.description.match(/[.!?](?=\s|$)/g) ?? []).length;
  if (sentenceCount < 2) {
    issues.push('Include at least two complete sentences in the description before any feature list.');
  }
  if (upperCaseRatio(normalized.description) > 0.65 && normalized.description.replace(/[^A-Za-z]/g, '').length >= 30) {
    issues.push('Use normal sentence casing instead of writing the description in all caps.');
  }

  if (!normalized.location || !normalized.city || !normalized.province) {
    issues.push('Add a subdivision or area, city, and province.');
  }
  if (input.imageCount < minimumPublishedPhotos) {
    issues.push(`Add at least ${minimumPublishedPhotos} property photos before publishing.`);
  }
  if (input.featured && input.imageCount < minimumFeaturedPhotos) {
    issues.push(`Featured listings need at least ${minimumFeaturedPhotos} property photos.`);
  }

  if (input.mainPhotoWidth && input.mainPhotoHeight) {
    const longEdge = Math.max(input.mainPhotoWidth, input.mainPhotoHeight);
    const shortEdge = Math.min(input.mainPhotoWidth, input.mainPhotoHeight);
    if (longEdge < minimumPhotoLongEdge || shortEdge < minimumPhotoShortEdge) {
      issues.push(`Use a main photo of at least ${minimumPhotoLongEdge}\u00d7${minimumPhotoShortEdge} pixels.`);
    }
    if (input.mainPhotoWidth < input.mainPhotoHeight) {
      issues.push('Use a landscape-oriented main photo so listing cards crop cleanly.');
    }
  }

  return Array.from(new Set(issues));
}

export function descriptionSections(value: string) {
  const normalized = normalizeProfessionalDescription(value);
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 3) return { paragraphs: [] as string[], highlights: lines };
  return {
    paragraphs: normalized.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean),
    highlights: [] as string[],
  };
}
