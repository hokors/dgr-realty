import { z } from 'zod';
import { propertyPublicationStatuses, propertyStatuses } from '@/lib/admin/types';

const uuid = z.string().uuid();
const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();
const optionalNumber = (maximum: number, integer = false) => {
  const number = z.number().finite().nonnegative().max(maximum);
  return (integer ? number.int() : number).nullable();
};

export const propertyInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1).max(10_000),
  categoryId: uuid,
  listingType: z.enum(['For Sale', 'For Rent']),
  price: z.number().finite().nonnegative().max(1_000_000_000_000_000),
  priceSuffix: optionalText(80),
  location: z.string().trim().min(1).max(240),
  city: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(120),
  mapLocation: optionalText(2_048),
  showMap: z.boolean(),
  bedrooms: optionalNumber(1_000, true),
  bathrooms: optionalNumber(1_000).refine((value) => value === null || Number.isInteger(value * 2), {
    message: 'Bathrooms must use whole or half values.',
  }),
  parkingSpaces: optionalNumber(1_000, true),
  lotArea: optionalNumber(1_000_000_000),
  floorArea: optionalNumber(1_000_000_000),
  status: z.enum(propertyStatuses),
  featured: z.boolean(),
  publicationStatus: z.enum(propertyPublicationStatuses),
}).strict();

const existingImageSchema = z.object({ kind: z.literal('existing'), id: uuid }).strict();
const stagedImageSchema = z.object({
  kind: z.literal('staged'),
  path: z.string().min(1).max(512),
}).strict();

export const propertySaveSchema = z.object({
  operationId: uuid,
  propertyId: uuid.optional(),
  create: z.boolean(),
  property: propertyInputSchema,
  amenities: z.array(z.string().trim().min(1).max(120)).max(100),
  images: z.array(z.discriminatedUnion('kind', [existingImageSchema, stagedImageSchema])).max(30),
}).strict().superRefine((value, context) => {
  if (!value.create && !value.propertyId) {
    context.addIssue({ code: 'custom', path: ['propertyId'], message: 'An existing property ID is required.' });
  }
  if (value.create && value.images.some((image) => image.kind === 'existing')) {
    context.addIssue({ code: 'custom', path: ['images'], message: 'New properties cannot use existing images.' });
  }
});

export const propertyQuickUpdateSchema = z.object({
  status: z.enum(propertyStatuses).optional(),
  featured: z.boolean().optional(),
  publicationStatus: z.enum(propertyPublicationStatuses).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one change is required.' });

export const imageStageSchema = z.object({
  draftId: uuid,
  name: z.string().trim().min(1).max(180),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  size: z.number().int().positive().max(10 * 1024 * 1024),
}).strict();

export const imageCleanupSchema = z.object({
  paths: z.array(z.string().min(1).max(512)).max(30),
}).strict();

export const inquirySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(40).optional().default(''),
  interest: z.string().trim().max(120).optional().default(''),
  preferredLocation: z.string().trim().max(160).optional().default(''),
  message: z.string().trim().min(10).max(3_000),
  propertyId: uuid.optional(),
  propertyTitle: z.string().trim().max(200).optional(),
  source: z.enum(['homepage', 'property']),
  consent: z.literal(true),
  website: z.string().trim().max(200).optional().default(''),
  startedAt: z.coerce.number().finite().positive(),
  turnstileToken: z.string().trim().max(2_048).optional().default(''),
}).strict();

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(1_024),
}).strict();

export const adminMfaVerifySchema = z.object({
  factorId: uuid,
  code: z.string().trim().regex(/^\d{6}$/),
}).strict();

export const inquiryStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'closed']),
}).strict();

const filterPrice = z.string().regex(/^$|^(?:0|[1-9]\d{0,14})(?:\.\d{1,2})?$/);
export const propertyFilterSchema = z.object({
  query: z.string().trim().max(120).default(''),
  category: z.enum(['All', 'House', 'Condominium', 'Lot', 'Raw Land', 'Rentals', 'Commercial', 'Farm Lot']).default('All'),
  listingType: z.enum(['All', 'For Sale', 'For Rent']).default('All'),
  minPrice: filterPrice.default(''),
  maxPrice: filterPrice.default(''),
  sort: z.enum(['Newest', 'Price: Low to High', 'Price: High to Low']).default('Newest'),
}).strict();

export const propertySlugSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const uuidSchema = uuid;
