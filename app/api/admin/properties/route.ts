import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  cleanText,
  discardStagedImages,
  getAdminMutationContext,
  hasValidMutationOrigin,
  imageExtensions,
  isUuid,
  maximumPropertyImages,
  processStorageCleanup,
  propertyImageBucket,
  removeStoragePaths,
} from '@/lib/admin/property-mutations';
import { propertyPublicationStatuses, propertyStatuses } from '@/lib/admin/types';

export const runtime = 'nodejs';

type ImageInput = { kind?: unknown; id?: unknown; path?: unknown };
type PropertyInput = {
  title?: unknown;
  description?: unknown;
  categoryId?: unknown;
  listingType?: unknown;
  price?: unknown;
  priceSuffix?: unknown;
  location?: unknown;
  city?: unknown;
  province?: unknown;
  bedrooms?: unknown;
  bathrooms?: unknown;
  parkingSpaces?: unknown;
  lotArea?: unknown;
  floorArea?: unknown;
  status?: unknown;
  featured?: unknown;
  publicationStatus?: unknown;
};
type SaveRequest = {
  operationId?: unknown;
  propertyId?: unknown;
  create?: unknown;
  property?: PropertyInput;
  amenities?: unknown;
  images?: unknown;
};

function optionalNumber(value: unknown, integer = false) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) throw new Error('Property measurements must be valid non-negative numbers.');
  return number;
}

function validateProperty(input: PropertyInput | undefined) {
  const title = cleanText(input?.title, 200);
  const description = cleanText(input?.description, 10000);
  const categoryId = isUuid(input?.categoryId) ? input.categoryId : '';
  const listingType = input?.listingType === 'For Rent' ? 'For Rent' : input?.listingType === 'For Sale' ? 'For Sale' : '';
  const price = Number(input?.price);
  const location = cleanText(input?.location, 240);
  const city = cleanText(input?.city, 120);
  const province = cleanText(input?.province, 120);
  const status = typeof input?.status === 'string' && propertyStatuses.includes(input.status as (typeof propertyStatuses)[number]) ? input.status : '';
  const publicationStatus = typeof input?.publicationStatus === 'string'
    && propertyPublicationStatuses.includes(input.publicationStatus as (typeof propertyPublicationStatuses)[number])
    ? input.publicationStatus
    : '';

  if (title.length < 2 || !description || !categoryId || !listingType || !Number.isFinite(price) || price < 0 || !location || !city || !province || !status || !publicationStatus) {
    throw new Error('Please complete all required property fields with valid values.');
  }

  return {
    title,
    description,
    category_id: categoryId,
    listing_type: listingType,
    price,
    price_suffix: cleanText(input?.priceSuffix, 80) || null,
    location,
    city,
    province,
    bedrooms: optionalNumber(input?.bedrooms, true),
    bathrooms: optionalNumber(input?.bathrooms),
    parking_spaces: optionalNumber(input?.parkingSpaces, true),
    lot_area: optionalNumber(input?.lotArea),
    floor_area: optionalNumber(input?.floorArea),
    status,
    featured: input?.featured === true,
    publication_status: publicationStatus,
  };
}

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const context = await getAdminMutationContext();
  if (!context) return NextResponse.json({ error: 'Administrator authentication and server configuration are required.' }, { status: 401 });

  let body: SaveRequest;
  try {
    body = await request.json() as SaveRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid property save request.' }, { status: 400 });
  }

  const operationId = isUuid(body.operationId) ? body.operationId : null;
  const create = body.create === true;
  const propertyId = create ? (isUuid(body.propertyId) ? body.propertyId : randomUUID()) : (isUuid(body.propertyId) ? body.propertyId : null);
  if (!operationId || !propertyId) return NextResponse.json({ error: 'Invalid property save identifiers.' }, { status: 400 });

  let propertyPayload: ReturnType<typeof validateProperty>;
  try {
    propertyPayload = validateProperty(body.property);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid property details.' }, { status: 400 });
  }

  const amenities = Array.isArray(body.amenities)
    ? Array.from(new Set(body.amenities.map((item) => cleanText(item, 120)).filter(Boolean))).slice(0, 100)
    : [];
  const imageInputs = Array.isArray(body.images) ? body.images as ImageInput[] : [];
  if (imageInputs.length > maximumPropertyImages) return NextResponse.json({ error: `A property can have at most ${maximumPropertyImages} images.` }, { status: 400 });

  const existingIds: string[] = [];
  const stagedPaths: string[] = [];
  for (const image of imageInputs) {
    if (image.kind === 'existing' && isUuid(image.id)) existingIds.push(image.id);
    else if (image.kind === 'staged' && typeof image.path === 'string' && image.path.startsWith(`_staging/${context.admin.id}/`)) stagedPaths.push(image.path);
    else return NextResponse.json({ error: 'The property image list is invalid.' }, { status: 400 });
  }
  if (new Set([...existingIds, ...stagedPaths]).size !== imageInputs.length) {
    return NextResponse.json({ error: 'The property image list contains duplicates.' }, { status: 400 });
  }

  const { data: replay } = await context.supabase
    .from('property_mutation_requests')
    .select('property_id')
    .eq('operation_id', operationId)
    .eq('created_by', context.admin.id)
    .maybeSingle();
  if (replay?.property_id) {
    await discardStagedImages(context.supabase, context.admin.id, stagedPaths);
    const { data: savedProperty } = await context.supabase.from('properties').select('id, slug').eq('id', replay.property_id).single();
    return NextResponse.json({ success: true, property: savedProperty, replayed: true });
  }

  let existingImageMap = new Map<string, { id: string; image_url: string; storage_path: string | null; alt_text: string | null }>();
  if (create && existingIds.length > 0) return NextResponse.json({ error: 'A new property cannot reference existing images.' }, { status: 400 });
  if (!create) {
    const { data: property, error: propertyError } = await context.supabase
      .from('properties')
      .select('id, property_images(id, image_url, storage_path, alt_text)')
      .eq('id', propertyId)
      .maybeSingle();
    if (propertyError || !property) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
    existingImageMap = new Map((property.property_images ?? []).map((image) => [image.id, image]));
    if (existingIds.some((id) => !existingImageMap.has(id))) return NextResponse.json({ error: 'An existing property image is invalid.' }, { status: 400 });
  }

  const { data: stagedRows, error: stagedError } = stagedPaths.length > 0
    ? await context.supabase
        .from('property_image_staging')
        .select('path, original_name, content_type, size_bytes')
        .eq('created_by', context.admin.id)
        .in('path', stagedPaths)
    : { data: [], error: null };
  if (stagedError || (stagedRows?.length ?? 0) !== stagedPaths.length) {
    return NextResponse.json({ error: 'One or more staged images expired. Please save again to re-upload them.' }, { status: 400 });
  }
  const stagedMap = new Map((stagedRows ?? []).map((row) => [row.path as string, row]));

  const movedImages = new Map<string, { id: string; image_url: string; storage_path: string; alt_text: string }>();
  const finalPaths: string[] = [];
  for (const path of stagedPaths) {
    const staged = stagedMap.get(path);
    const extension = staged ? imageExtensions[staged.content_type as string] : null;
    if (!staged || !extension) {
      await discardStagedImages(context.supabase, context.admin.id, stagedPaths);
      return NextResponse.json({ error: 'A staged image has invalid metadata.' }, { status: 400 });
    }
    const finalPath = `${propertyId}/${randomUUID()}.${extension}`;
    const { error: trackingError } = await context.supabase
      .from('property_image_staging')
      .update({ final_path: finalPath })
      .eq('created_by', context.admin.id)
      .eq('path', path);
    if (trackingError) {
      await discardStagedImages(context.supabase, context.admin.id, stagedPaths);
      return NextResponse.json({ error: 'Unable to track the staged image safely.' }, { status: 500 });
    }
    const { error: moveError } = await context.supabase.storage.from(propertyImageBucket).move(path, finalPath);
    if (moveError) {
      await removeStoragePaths(context.supabase, finalPaths, 'Rollback after staged image move failure');
      await discardStagedImages(context.supabase, context.admin.id, stagedPaths);
      return NextResponse.json({ error: `Unable to finalize a property image: ${moveError.message}` }, { status: 500 });
    }
    finalPaths.push(finalPath);
    const { data: publicImage } = context.supabase.storage.from(propertyImageBucket).getPublicUrl(finalPath);
    movedImages.set(path, { id: randomUUID(), image_url: publicImage.publicUrl, storage_path: finalPath, alt_text: propertyPayload.title });
  }

  let imageManifest: Array<{ id: string; image_url: string; storage_path: string | null; alt_text: string | null }>;
  try {
    imageManifest = imageInputs.map((image) => {
      if (image.kind === 'existing') {
        const existing = existingImageMap.get(image.id as string);
        if (!existing) throw new Error('Existing image metadata is unavailable.');
        return { ...existing, alt_text: existing.alt_text || propertyPayload.title };
      }
      const moved = movedImages.get(image.path as string);
      if (!moved) throw new Error('Staged image metadata is unavailable.');
      return moved;
    });
  } catch (manifestError) {
    await removeStoragePaths(context.supabase, finalPaths, 'Rollback after image manifest failure');
    await discardStagedImages(context.supabase, context.admin.id, stagedPaths);
    return NextResponse.json({ error: manifestError instanceof Error ? manifestError.message : 'Unable to prepare property images.' }, { status: 500 });
  }

  const { data: savedRows, error: saveError } = await context.supabase.rpc('save_property_with_publication_atomic', {
    p_operation_id: operationId,
    p_property_id: propertyId,
    p_create: create,
    p_admin_id: context.admin.id,
    p_payload: propertyPayload,
    p_amenities: amenities,
    p_images: imageManifest,
    p_staged_paths: stagedPaths,
  });

  if (saveError || !savedRows?.[0]) {
    // A network failure can happen after PostgreSQL committed. Confirm the
    // idempotency record before removing files that the committed row may use.
    const { data: committed, error: commitCheckError } = await context.supabase
      .from('property_mutation_requests')
      .select('property_id')
      .eq('operation_id', operationId)
      .eq('created_by', context.admin.id)
      .maybeSingle();
    if (committed?.property_id) {
      const { data: committedProperty } = await context.supabase
        .from('properties')
        .select('id, slug')
        .eq('id', committed.property_id)
        .single();
      await processStorageCleanup(context.supabase);
      return NextResponse.json({ success: true, property: committedProperty, recovered: true });
    }
    if (!commitCheckError) {
      await discardStagedImages(context.supabase, context.admin.id, stagedPaths);
    }
    // If even the commit check is unavailable, leave the tracked staging rows
    // intact. The next mutation will safely clean them after their expiry.
    return NextResponse.json({ error: saveError?.message ?? 'Unable to save the property transaction.' }, { status: 500 });
  }

  await processStorageCleanup(context.supabase);
  return NextResponse.json({
    success: true,
    property: { id: savedRows[0].saved_property_id, slug: savedRows[0].saved_slug },
  });
}
