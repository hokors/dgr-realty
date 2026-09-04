'use client';

import { ChangeEvent, DragEvent, FormEvent, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, GripVertical, ImagePlus, LoaderCircle, Save, Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { adminCategories, propertyPublicationStatuses, propertyStatuses, type AdminCategory, type AdminImage, type AdminProperty } from '@/lib/admin/types';
import {
  getPublicationQualityIssues,
  minimumFeaturedPhotos,
  minimumPhotoLongEdge,
  minimumPhotoShortEdge,
  minimumPublishedPhotos,
} from '@/lib/property-quality';
import type { ListingType, PropertyPublicationStatus } from '@/lib/types';

type ExistingImageItem = { kind: 'existing'; key: string; image: AdminImage; previewUrl: string };
type NewImageItem = { kind: 'new'; key: string; file: File; previewUrl: string; width?: number; height?: number };
type ImageItem = ExistingImageItem | NewImageItem;
type SaveProgress = { label: string; current?: number; total?: number };

const IMAGE_OPTIMIZATION_CONCURRENCY = 2;
const IMAGE_UPLOAD_CONCURRENCY = 5;
const IMAGE_UPLOAD_ATTEMPTS = 3;
const MAX_IMAGE_DIMENSION = 2200;
const WEBP_QUALITY = 0.84;

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function webpFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'property-photo';
  return `${baseName}.webp`;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The browser could not optimize this image.'));
    }, 'image/webp', WEBP_QUALITY);
  });
}

async function optimizeImage(file: File) {
  if (typeof createImageBitmap !== 'function') return file;

  let bitmap: ImageBitmap | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    const optimizedBlob = await canvasToBlob(canvas);

    // Keep the original when transcoding would make an already-efficient file larger.
    if (scale === 1 && optimizedBlob.size >= file.size) return file;
    return new File([optimizedBlob], webpFileName(file.name), {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } catch {
    // An unsupported browser/codec should not prevent a reliable original-file upload.
    return file;
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}

async function readImageDimensions(file: File) {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return null;
  }
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function PropertyForm({ categories, initialProperty }: { categories: AdminCategory[]; initialProperty?: AdminProperty }) {
  const router = useRouter();
  const isEditing = Boolean(initialProperty);
  const initialImages = useMemo<ImageItem[]>(() => [...(initialProperty?.property_images ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((image) => ({ kind: 'existing', key: image.id, image, previewUrl: image.image_url })), [initialProperty]);
  const [images, setImages] = useState<ImageItem[]>(initialImages);
  const [operationId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  const [saveProgress, setSaveProgress] = useState<SaveProgress | null>(null);
  const [draggedImageKey, setDraggedImageKey] = useState<string | null>(null);
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});

  const allowedCategories = categories.filter((category) => adminCategories.includes(category.name as (typeof adminCategories)[number]));
  const amenities = initialProperty?.property_amenities.map((item) => item.amenities?.name).filter((name): name is string => Boolean(name)).join(', ') ?? '';

  async function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setError('');
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
    const accepted = files.filter((file) => allowedTypes.has(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024);
    if (accepted.length !== files.length) setError('Use JPG, PNG, WebP, or AVIF images no larger than 10 MB.');
    if (images.length + accepted.length > 30) {
      setError('A property can have at most 30 photos.');
      return;
    }
    const inspected = await Promise.all(accepted.map(async (file) => ({ file, dimensions: await readImageDimensions(file) })));
    const usable = inspected.filter(({ dimensions }) => !dimensions || (
      Math.max(dimensions.width, dimensions.height) >= minimumPhotoLongEdge
      && Math.min(dimensions.width, dimensions.height) >= minimumPhotoShortEdge
    ));
    if (usable.length !== inspected.length) {
      const skipped = inspected.length - usable.length;
      setError(`${skipped} low-resolution ${skipped === 1 ? 'photo was' : 'photos were'} skipped. Use images at least ${minimumPhotoLongEdge}×${minimumPhotoShortEdge} pixels.`);
    }
    setImages((current) => [
      ...current,
      ...usable.map<NewImageItem>(({ file, dimensions }) => ({
        kind: 'new',
        key: `new-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        width: dimensions?.width,
        height: dimensions?.height,
      })),
    ]);
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    setImages((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function makeMainImage(index: number) {
    if (index === 0) return;
    setImages((current) => {
      const next = [...current];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
  }

  function reorderImage(sourceKey: string, targetKey: string) {
    if (sourceKey === targetKey) return;
    setImages((current) => {
      const sourceIndex = current.findIndex((item) => item.key === sourceKey);
      const targetIndex = current.findIndex((item) => item.key === targetKey);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function dropImage(event: DragEvent<HTMLDivElement>, targetKey: string) {
    event.preventDefault();
    const sourceKey = draggedImageKey ?? event.dataTransfer.getData('text/plain');
    if (sourceKey) reorderImage(sourceKey, targetKey);
    setDraggedImageKey(null);
    setDragTargetKey(null);
  }

  function removeImage(index: number) {
    setImages((current) => {
      const item = current[index];
      if (item.kind === 'new') URL.revokeObjectURL(item.previewUrl);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function stageNewImages() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured.');
    const storage = supabase.storage.from('property-images');
    const newImages = images.filter((item): item is NewImageItem => item.kind === 'new');
    const stagedByKey = new Map<string, string>();
    const stagedPaths: string[] = [];
    try {
      if (newImages.length === 0) return { stagedByKey, stagedPaths };

      const optimizedFiles = new Map<string, File>();
      let nextOptimizationIndex = 0;
      let optimizedCount = 0;
      setSaveProgress({ label: `Optimizing 0 of ${newImages.length}`, current: 0, total: newImages.length });

      async function optimizationWorker() {
        while (true) {
          const imageIndex = nextOptimizationIndex;
          nextOptimizationIndex += 1;
          if (imageIndex >= newImages.length) return;
          const item = newImages[imageIndex];
          optimizedFiles.set(item.key, await optimizeImage(item.file));
          optimizedCount += 1;
          setSaveProgress({ label: `Optimizing ${optimizedCount} of ${newImages.length}`, current: optimizedCount, total: newImages.length });
        }
      }

      await Promise.all(Array.from(
        { length: Math.min(IMAGE_OPTIMIZATION_CONCURRENCY, newImages.length) },
        () => optimizationWorker(),
      ));

      async function removeStagedPath(path: string) {
        await fetch('/api/admin/property-images/stage', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: [path] }),
        }).catch(() => undefined);
      }

      async function uploadImage(item: NewImageItem) {
        const file = optimizedFiles.get(item.key) ?? item.file;
        let lastError: unknown = new Error('Unable to upload this photo.');

        for (let attempt = 1; attempt <= IMAGE_UPLOAD_ATTEMPTS; attempt += 1) {
          let attemptPath: string | null = null;
          try {
            const prepareResponse = await fetch('/api/admin/property-images/stage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ draftId: operationId, name: file.name, type: file.type, size: file.size }),
            });
            const prepared = await prepareResponse.json() as { path?: string; token?: string; error?: string };
            if (!prepareResponse.ok || !prepared.path || !prepared.token) throw new Error(prepared.error ?? 'Unable to prepare an image upload.');
            attemptPath = prepared.path;
            const { error: uploadError } = await storage.uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
            if (uploadError) throw uploadError;
            stagedByKey.set(item.key, prepared.path);
            stagedPaths.push(prepared.path);
            return;
          } catch (uploadError) {
            lastError = uploadError;
            if (attemptPath) await removeStagedPath(attemptPath);
            if (attempt < IMAGE_UPLOAD_ATTEMPTS) await delay(300 * attempt);
          }
        }

        throw lastError;
      }

      let nextUploadIndex = 0;
      let uploadedCount = 0;
      const failedUploads: Array<{ item: NewImageItem; error: unknown }> = [];
      setSaveProgress({ label: `Uploading 0 of ${newImages.length}`, current: 0, total: newImages.length });

      async function uploadWorker() {
        while (true) {
          const imageIndex = nextUploadIndex;
          nextUploadIndex += 1;
          if (imageIndex >= newImages.length) return;
          const item = newImages[imageIndex];
          try {
            await uploadImage(item);
            uploadedCount += 1;
            setSaveProgress({ label: `Uploading ${uploadedCount} of ${newImages.length}`, current: uploadedCount, total: newImages.length });
          } catch (uploadError) {
            failedUploads.push({ item, error: uploadError });
          }
        }
      }

      const workerCount = Math.min(IMAGE_UPLOAD_CONCURRENCY, newImages.length);
      await Promise.all(Array.from({ length: workerCount }, () => uploadWorker()));
      if (failedUploads.length > 0) {
        const noun = failedUploads.length === 1 ? 'photo' : 'photos';
        throw new Error(`Unable to upload ${failedUploads.length} ${noun} after ${IMAGE_UPLOAD_ATTEMPTS} attempts. No property changes were saved.`);
      }
      return { stagedByKey, stagedPaths };
    } catch (stageError) {
      await fetch('/api/admin/property-images/stage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: stagedPaths }),
      }).catch(() => undefined);
      throw stageError;
    }
  }

  async function saveProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setQualityIssues([]);
    setSaveProgress({ label: 'Preparing property photos…' });

    let stagedPaths: string[] = [];
    try {
      const form = new FormData(event.currentTarget);
      const title = String(form.get('title') ?? '').trim();
      const listingType = String(form.get('listing_type') ?? 'For Sale') as ListingType;
      const publicationStatus = String(form.get('publication_status') ?? 'draft') as PropertyPublicationStatus;
      const featured = form.get('featured') === 'on';
      if (publicationStatus === 'published') {
        const mainImage = images[0];
        const mainDimensions = mainImage?.kind === 'new'
          ? { width: mainImage.width, height: mainImage.height }
          : imageDimensions[mainImage?.key ?? ''];
        const issues = getPublicationQualityIssues({
          title,
          description: String(form.get('description') ?? '').trim(),
          listingType,
          priceSuffix: String(form.get('price_suffix') ?? '').trim() || null,
          location: String(form.get('location') ?? '').trim(),
          city: String(form.get('city') ?? '').trim(),
          province: String(form.get('province') ?? '').trim(),
          featured,
          imageCount: images.length,
          mainPhotoWidth: mainDimensions?.width,
          mainPhotoHeight: mainDimensions?.height,
        });
        if (issues.length > 0) {
          setQualityIssues(issues);
          throw new Error('Complete the listing quality checks before publishing.');
        }
      }
      const { stagedByKey, stagedPaths: uploadedPaths } = await stageNewImages();
      stagedPaths = uploadedPaths;
      setSaveProgress({ label: 'Saving property details…' });
      const property = {
        title,
        description: String(form.get('description') ?? '').trim(),
        categoryId: String(form.get('category_id') ?? ''),
        listingType,
        price: Number(form.get('price') ?? 0),
        priceSuffix: String(form.get('price_suffix') ?? '').trim() || null,
        location: String(form.get('location') ?? '').trim(),
        city: String(form.get('city') ?? '').trim(),
        province: String(form.get('province') ?? '').trim(),
        mapLocation: String(form.get('map_location') ?? '').trim() || null,
        showMap: form.get('show_map') === 'on',
        bedrooms: optionalNumber(form.get('bedrooms')),
        bathrooms: optionalNumber(form.get('bathrooms')),
        parkingSpaces: optionalNumber(form.get('parking_spaces')),
        lotArea: optionalNumber(form.get('lot_area')),
        floorArea: optionalNumber(form.get('floor_area')),
        status: String(form.get('status') ?? 'Available'),
        featured,
        publicationStatus,
      };
      const amenitiesList = Array.from(new Set(String(form.get('amenities') ?? '').split(/[,\n]/).map((item) => item.trim()).filter(Boolean)));
      const imageManifest = images.map((item) => item.kind === 'existing'
        ? { kind: 'existing', id: item.image.id }
        : { kind: 'staged', path: stagedByKey.get(item.key) });

      const response = await fetch('/api/admin/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId,
          propertyId: initialProperty?.id,
          create: !initialProperty,
          property,
          amenities: amenitiesList,
          images: imageManifest,
        }),
      });
      const result = await response.json() as { success?: boolean; error?: string; issues?: string[] };
      if (!response.ok || !result.success) {
        if (result.issues?.length) setQualityIssues(result.issues);
        throw new Error(result.error ?? 'Unable to save this property.');
      }
      router.push('/admin/properties');
      router.refresh();
    } catch (saveError) {
      if (stagedPaths.length > 0) {
        await fetch('/api/admin/property-images/stage', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: stagedPaths }),
        }).catch(() => undefined);
      }
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this property.');
      setSaveProgress(null);
      setSaving(false);
    }
  }

  const field = 'form-field';

  return (
    <form onSubmit={saveProperty}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><Link href="/admin/properties" className="flex items-center gap-2 text-xs font-bold text-[#24634e]"><ArrowLeft className="h-3.5 w-3.5" /> Back to properties</Link><h1 className="display mt-4 text-4xl tracking-[-0.045em] sm:text-5xl">{isEditing ? 'Edit property' : 'Add property'}</h1><p className="mt-3 text-sm text-[#68716b]">{isEditing ? 'Update listing details and property photos.' : 'Create a new listing for the public marketplace.'}</p></div>
        <button disabled={saving} className="flex items-center justify-center gap-2 self-start rounded-xl bg-[#24634e] px-5 py-3 text-sm font-bold text-white hover:bg-[#1b4f3e] disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? saveProgress?.label ?? 'Saving…' : 'Save property'}</button>
      </div>

      {error && <p className="mt-5 rounded-xl bg-[#fae8e6] px-4 py-3 text-sm text-[#923f38]" role="alert">{error}</p>}
      {qualityIssues.length > 0 && <div className="mt-3 rounded-xl border border-[#e6c9c4] bg-[#fff7f5] px-4 py-4 text-sm text-[#7e3832]" role="alert"><p className="font-bold">Before this listing can be published:</p><ul className="mt-2 list-disc space-y-1 pl-5">{qualityIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
      {saving && saveProgress && <div className="mt-5 rounded-xl border border-[#cfe0d7] bg-[#edf5f0] px-4 py-3" role="status" aria-live="polite"><div className="flex items-center justify-between gap-4 text-sm font-semibold text-[#285946]"><span>{saveProgress.label}</span>{saveProgress.total != null && <span>{Math.round(((saveProgress.current ?? 0) / saveProgress.total) * 100)}%</span>}</div>{saveProgress.total != null && <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#d3e4da]"><div className="h-full rounded-full bg-[#24634e] transition-[width] duration-300" style={{ width: `${((saveProgress.current ?? 0) / saveProgress.total) * 100}%` }} /></div>}</div>}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dde2de] bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold">Basic information</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2"><span className="field-label">Property title</span><input name="title" defaultValue={initialProperty?.title} required maxLength={120} className={field} placeholder="e.g. Modern family home in Angeles City" /><span className="mt-2 block text-xs leading-5 text-[#68716b]">Use a location-led title. Do not add “For Sale,” “For Rent,” phone numbers, or repeated punctuation.</span></label>
              <label><span className="field-label">Category</span><select name="category_id" defaultValue={initialProperty?.category_id ?? ''} required className={field}><option value="" disabled>Select a category</option>{allowedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><span className="field-label">Sale or rent</span><select name="listing_type" defaultValue={initialProperty?.listing_type ?? 'For Sale'} className={field}><option>For Sale</option><option>For Rent</option></select></label>
              <label><span className="field-label">Price (PHP)</span><input name="price" type="number" min="0" step="0.01" defaultValue={initialProperty?.price} required className={field} /></label>
              <label><span className="field-label">Price suffix (optional)</span><input name="price_suffix" defaultValue={initialProperty?.price_suffix ?? ''} className={field} placeholder="e.g. /month" /><span className="mt-2 block text-xs leading-5 text-[#68716b]">For rentals only. Sale listings remove this automatically.</span></label>
              <label className="md:col-span-2"><span className="field-label">Description</span><textarea name="description" defaultValue={initialProperty?.description} required maxLength={5000} rows={7} className={`${field} resize-y`} placeholder="Describe the property, highlights, and nearby landmarks." /><span className="mt-2 block text-xs leading-5 text-[#68716b]">Published listings need at least 120 characters and two complete sentences before any feature list.</span></label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#dde2de] bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold">Location</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="md:col-span-3"><span className="field-label">Listing location</span><input name="location" defaultValue={initialProperty?.location} required className={field} placeholder="Subdivision or barangay" /><span className="mt-2 block text-xs leading-5 text-[#68716b]">Enter the subdivision or area only. City and province are added automatically, so do not repeat them here.</span></label>
              <label><span className="field-label">City</span><input name="city" defaultValue={initialProperty?.city} required className={field} /></label>
              <label className="md:col-span-2"><span className="field-label">Province</span><input name="province" defaultValue={initialProperty?.province ?? 'Pampanga'} required className={field} /></label>
              <label className="md:col-span-3"><span className="field-label">Public map location (optional)</span><input name="map_location" defaultValue={initialProperty?.map_location ?? ''} maxLength={2048} className={field} placeholder="Clark Freeport Zone, Pampanga or paste a Google Maps link" /><span className="mt-2 block text-xs leading-5 text-[#68716b]">Enter only the subdivision, barangay, city, or approximate area you want visitors to see. Leave blank to use the listing location above.</span></label>
              <label className="md:col-span-3 flex items-start gap-3 rounded-xl border border-[#dde2de] p-4"><input name="show_map" type="checkbox" defaultChecked={initialProperty?.show_map ?? true} className="mt-0.5 h-4 w-4 accent-[#24634e]" /><span><span className="block text-sm font-semibold">Show map on public listing</span><span className="mt-1 block text-xs leading-5 text-[#68716b]">Turn this off when the location should not appear on a map.</span></span></label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#dde2de] bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold">Property details</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label><span className="field-label">Bedrooms</span><input name="bedrooms" type="number" min="0" defaultValue={initialProperty?.bedrooms ?? ''} className={field} /></label>
              <label><span className="field-label">Bathrooms</span><input name="bathrooms" type="number" min="0" step="0.5" defaultValue={initialProperty?.bathrooms ?? ''} className={field} /></label>
              <label><span className="field-label">Parking spaces</span><input name="parking_spaces" type="number" min="0" defaultValue={initialProperty?.parking_spaces ?? ''} className={field} /></label>
              <label><span className="field-label">Lot area (sqm)</span><input name="lot_area" type="number" min="0" step="0.01" defaultValue={initialProperty?.lot_area ?? ''} className={field} /></label>
              <label><span className="field-label">Floor area (sqm)</span><input name="floor_area" type="number" min="0" step="0.01" defaultValue={initialProperty?.floor_area ?? ''} className={field} /></label>
            </div>
            <label className="mt-5 block"><span className="field-label">Amenities and features</span><textarea name="amenities" defaultValue={amenities} rows={4} className={`${field} resize-y`} placeholder="Swimming pool, Guarded subdivision, Balcony (separate with commas or new lines)" /><span className="mt-2 block text-xs text-[#68716b]">Separate each feature with a comma or new line.</span></label>
          </section>

          <section className="rounded-2xl border border-[#dde2de] bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Property photos</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#68716b]">Drag photos to reorder them; the first is the main image. Published listings need {minimumPublishedPhotos} photos, featured listings need {minimumFeaturedPhotos}, and every photo must be at least {minimumPhotoLongEdge}×{minimumPhotoShortEdge}px. Use a landscape main photo.</p></div><label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfd6d1] bg-white px-4 py-2.5 text-xs font-bold text-[#24634e] hover:bg-[#f1f5f2]"><ImagePlus className="h-4 w-4" /> Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={addImages} disabled={saving} className="absolute inset-0 cursor-pointer opacity-0" /></label></div>
            {images.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-[#cfd6d1] px-6 py-14 text-center"><ImagePlus className="mx-auto h-6 w-6 text-[#68716b]" /><p className="mt-3 text-sm font-semibold">No photos selected</p><p className="mt-1 text-xs text-[#68716b]">Add JPG, PNG, WebP, or AVIF files.</p></div> : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((item, index) => (
                  <div
                    key={item.key}
                    draggable={!saving}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', item.key);
                      setDraggedImageKey(item.key);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDragTargetKey(item.key);
                    }}
                    onDrop={(event) => dropImage(event, item.key)}
                    onDragEnd={() => {
                      setDraggedImageKey(null);
                      setDragTargetKey(null);
                    }}
                    className={`overflow-hidden rounded-xl border bg-[#f5f6f4] transition ${draggedImageKey === item.key ? 'scale-[0.98] opacity-50' : ''} ${dragTargetKey === item.key && draggedImageKey !== item.key ? 'border-[#24634e] ring-4 ring-[#24634e]/10' : 'border-[#dde2de]'}`}
                  >
                    <div className="relative aspect-[4/3] cursor-grab bg-[#e5e8e5] active:cursor-grabbing"><Image src={item.previewUrl} alt={`${initialProperty?.title ?? 'New property'} preview ${index + 1}`} fill unoptimized draggable={false} sizes="(max-width: 640px) 100vw, 320px" className="pointer-events-none object-cover" onLoad={(event) => setImageDimensions((current) => ({ ...current, [item.key]: { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight } }))} />{index === 0 && <span className="absolute left-2 top-2 rounded-lg bg-[#17362c]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">Main photo</span>}<span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-[#4c5650] shadow-sm" title="Drag to reorder"><GripVertical className="h-4 w-4" /></span></div>
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2"><span className="pl-1 text-xs font-semibold text-[#68716b]">Photo {index + 1}</span><div className="flex gap-1">{index > 0 && <button type="button" onClick={() => makeMainImage(index)} disabled={saving} aria-label={`Make photo ${index + 1} the main photo`} title="Make main photo" className="flex h-8 items-center gap-1 rounded-lg border border-[#d8ddd9] bg-white px-2 text-[10px] font-bold text-[#24634e] disabled:opacity-35"><Star className="h-3.5 w-3.5" /> Main</button>}<button type="button" onClick={() => moveImage(index, -1)} disabled={saving || index === 0} aria-label="Move photo earlier" className="grid h-8 w-8 place-items-center rounded-lg border border-[#d8ddd9] bg-white disabled:opacity-35"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" onClick={() => moveImage(index, 1)} disabled={saving || index === images.length - 1} aria-label="Move photo later" className="grid h-8 w-8 place-items-center rounded-lg border border-[#d8ddd9] bg-white disabled:opacity-35"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => removeImage(index)} disabled={saving} aria-label="Delete photo" className="grid h-8 w-8 place-items-center rounded-lg border border-[#e4cbc8] bg-white text-[#98453e] disabled:opacity-35"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8">
          <section className="rounded-2xl border border-[#dde2de] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold">Publishing</h2>
            <div className="mt-5 space-y-4">
              <label><span className="field-label">Availability</span><select name="status" defaultValue={initialProperty?.status ?? 'Available'} className={field}>{propertyStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label><span className="field-label">Visibility</span><select name="publication_status" defaultValue={initialProperty?.publication_status ?? 'draft'} className={field}>{propertyPublicationStatuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select><span className="mt-2 block text-xs leading-5 text-[#68716b]">Draft and archived listings are hidden from the public website.</span></label>
              <label className="flex items-start gap-3 rounded-xl border border-[#dde2de] p-4"><input name="featured" type="checkbox" defaultChecked={initialProperty?.featured} className="mt-0.5 h-4 w-4 accent-[#24634e]" /><span><span className="block text-sm font-semibold">Featured listing</span><span className="mt-1 block text-xs leading-5 text-[#68716b]">Show this property in featured areas on the public site.</span></span></label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cfe0d7] bg-[#f4f8f5] p-5 text-sm text-[#355548]">
            <div className="flex items-center gap-2 font-bold text-[#234f3e]"><CheckCircle2 className="h-4 w-4" /> Publishing standard</div>
            <ul className="mt-3 space-y-2 text-xs leading-5">
              <li>Clear, location-led title and complete description</li>
              <li>Subdivision or area, city, and province</li>
              <li>{minimumPublishedPhotos}+ sharp photos with a landscape main image</li>
            </ul>
          </section>

          <div className="rounded-2xl bg-[#e5eee9] p-5 text-sm leading-6 text-[#3f5b4f]">Only published listings appear on the public website. Save as draft while details or photos are still being prepared.</div>

          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#24634e] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#1b4f3e] disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? saveProgress?.label ?? 'Saving property…' : 'Save property'}</button>
        </aside>
      </div>
    </form>
  );
}
