'use client';

import { ChangeEvent, DragEvent, FormEvent, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, ImagePlus, LoaderCircle, Save, Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { adminCategories, propertyPublicationStatuses, propertyStatuses, type AdminCategory, type AdminImage, type AdminProperty } from '@/lib/admin/types';

type ExistingImageItem = { kind: 'existing'; key: string; image: AdminImage; previewUrl: string };
type NewImageItem = { kind: 'new'; key: string; file: File; previewUrl: string };
type ImageItem = ExistingImageItem | NewImageItem;
type SaveProgress = { label: string; current?: number; total?: number };

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
  const [saveProgress, setSaveProgress] = useState<SaveProgress | null>(null);
  const [draggedImageKey, setDraggedImageKey] = useState<string | null>(null);
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);

  const allowedCategories = categories.filter((category) => adminCategories.includes(category.name as (typeof adminCategories)[number]));
  const amenities = initialProperty?.property_amenities.map((item) => item.amenities?.name).filter((name): name is string => Boolean(name)).join(', ') ?? '';

  function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
    const accepted = files.filter((file) => allowedTypes.has(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024);
    if (accepted.length !== files.length) setError('Use JPG, PNG, WebP, or AVIF images no larger than 10 MB.');
    if (images.length + accepted.length > 30) {
      setError('A property can have at most 30 photos.');
      event.target.value = '';
      return;
    }
    setImages((current) => [
      ...current,
      ...accepted.map<NewImageItem>((file) => ({ kind: 'new', key: `new-${crypto.randomUUID()}`, file, previewUrl: URL.createObjectURL(file) })),
    ]);
    event.target.value = '';
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
    let nextImageIndex = 0;
    let uploadedCount = 0;
    let uploadFailure: unknown = null;
    try {
      if (newImages.length === 0) return { stagedByKey, stagedPaths };
      setSaveProgress({ label: `Uploading 0 of ${newImages.length}`, current: 0, total: newImages.length });

      async function uploadWorker() {
        while (!uploadFailure) {
          const imageIndex = nextImageIndex;
          nextImageIndex += 1;
          if (imageIndex >= newImages.length) return;
          const item = newImages[imageIndex];
          try {
            const prepareResponse = await fetch('/api/admin/property-images/stage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ draftId: operationId, name: item.file.name, type: item.file.type, size: item.file.size }),
            });
            const prepared = await prepareResponse.json() as { path?: string; token?: string; error?: string };
            if (!prepareResponse.ok || !prepared.path || !prepared.token) throw new Error(prepared.error ?? 'Unable to prepare an image upload.');
            stagedPaths.push(prepared.path);
            const { error: uploadError } = await storage.uploadToSignedUrl(prepared.path, prepared.token, item.file, { contentType: item.file.type });
            if (uploadError) throw uploadError;
            stagedByKey.set(item.key, prepared.path);
            uploadedCount += 1;
            setSaveProgress({ label: `Uploading ${uploadedCount} of ${newImages.length}`, current: uploadedCount, total: newImages.length });
          } catch (workerError) {
            uploadFailure = workerError;
          }
        }
      }

      const workerCount = Math.min(3, newImages.length);
      await Promise.all(Array.from({ length: workerCount }, () => uploadWorker()));
      if (uploadFailure) throw uploadFailure;
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
    setSaveProgress({ label: 'Preparing property photos…' });

    let stagedPaths: string[] = [];
    try {
      const form = new FormData(event.currentTarget);
      const title = String(form.get('title') ?? '').trim();
      const { stagedByKey, stagedPaths: uploadedPaths } = await stageNewImages();
      stagedPaths = uploadedPaths;
      setSaveProgress({ label: 'Saving property details…' });
      const property = {
        title,
        description: String(form.get('description') ?? '').trim(),
        categoryId: String(form.get('category_id') ?? ''),
        listingType: String(form.get('listing_type') ?? 'For Sale'),
        price: Number(form.get('price') ?? 0),
        priceSuffix: String(form.get('price_suffix') ?? '').trim() || null,
        location: String(form.get('location') ?? '').trim(),
        city: String(form.get('city') ?? '').trim(),
        province: String(form.get('province') ?? '').trim(),
        bedrooms: optionalNumber(form.get('bedrooms')),
        bathrooms: optionalNumber(form.get('bathrooms')),
        parkingSpaces: optionalNumber(form.get('parking_spaces')),
        lotArea: optionalNumber(form.get('lot_area')),
        floorArea: optionalNumber(form.get('floor_area')),
        status: String(form.get('status') ?? 'Available'),
        featured: form.get('featured') === 'on',
        publicationStatus: String(form.get('publication_status') ?? 'draft'),
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
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Unable to save this property.');
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
      {saving && saveProgress && <div className="mt-5 rounded-xl border border-[#cfe0d7] bg-[#edf5f0] px-4 py-3" role="status" aria-live="polite"><div className="flex items-center justify-between gap-4 text-sm font-semibold text-[#285946]"><span>{saveProgress.label}</span>{saveProgress.total != null && <span>{Math.round(((saveProgress.current ?? 0) / saveProgress.total) * 100)}%</span>}</div>{saveProgress.total != null && <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#d3e4da]"><div className="h-full rounded-full bg-[#24634e] transition-[width] duration-300" style={{ width: `${((saveProgress.current ?? 0) / saveProgress.total) * 100}%` }} /></div>}</div>}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dde2de] bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold">Basic information</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2"><span className="field-label">Property title</span><input name="title" defaultValue={initialProperty?.title} required className={field} placeholder="e.g. Modern family home in Angeles City" /></label>
              <label><span className="field-label">Category</span><select name="category_id" defaultValue={initialProperty?.category_id ?? ''} required className={field}><option value="" disabled>Select a category</option>{allowedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><span className="field-label">Sale or rent</span><select name="listing_type" defaultValue={initialProperty?.listing_type ?? 'For Sale'} className={field}><option>For Sale</option><option>For Rent</option></select></label>
              <label><span className="field-label">Price (PHP)</span><input name="price" type="number" min="0" step="0.01" defaultValue={initialProperty?.price} required className={field} /></label>
              <label><span className="field-label">Price suffix (optional)</span><input name="price_suffix" defaultValue={initialProperty?.price_suffix ?? ''} className={field} placeholder="e.g. / month" /></label>
              <label className="md:col-span-2"><span className="field-label">Description</span><textarea name="description" defaultValue={initialProperty?.description} required rows={7} className={`${field} resize-y`} placeholder="Describe the property, highlights, and nearby landmarks." /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#dde2de] bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold">Location</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="md:col-span-3"><span className="field-label">Address or area</span><input name="location" defaultValue={initialProperty?.location} required className={field} placeholder="Subdivision, barangay, or street" /></label>
              <label><span className="field-label">City</span><input name="city" defaultValue={initialProperty?.city} required className={field} /></label>
              <label className="md:col-span-2"><span className="field-label">Province</span><input name="province" defaultValue={initialProperty?.province ?? 'Pampanga'} required className={field} /></label>
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
            <label className="mt-5 block"><span className="field-label">Amenities and features</span><textarea name="amenities" defaultValue={amenities} rows={4} className={`${field} resize-y`} placeholder="Swimming pool, Guarded subdivision, Balcony (separate with commas or new lines)" /><span className="mt-2 block text-xs text-[#7a827d]">Separate each feature with a comma or new line.</span></label>
          </section>

          <section className="rounded-2xl border border-[#dde2de] bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Property photos</h2><p className="mt-1 text-xs text-[#747c77]">Drag photos to reorder them. The first photo is the main listing image.</p></div><label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfd6d1] bg-white px-4 py-2.5 text-xs font-bold text-[#24634e] hover:bg-[#f1f5f2]"><ImagePlus className="h-4 w-4" /> Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={addImages} disabled={saving} className="absolute inset-0 cursor-pointer opacity-0" /></label></div>
            {images.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-[#cfd6d1] px-6 py-14 text-center"><ImagePlus className="mx-auto h-6 w-6 text-[#8a938d]" /><p className="mt-3 text-sm font-semibold">No photos selected</p><p className="mt-1 text-xs text-[#7a827d]">Add JPG, PNG, WebP, or AVIF files.</p></div> : (
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
                    <div className="relative aspect-[4/3] cursor-grab bg-[#e5e8e5] active:cursor-grabbing"><Image src={item.previewUrl} alt={`${initialProperty?.title ?? 'New property'} preview ${index + 1}`} fill unoptimized draggable={false} sizes="(max-width: 640px) 100vw, 320px" className="pointer-events-none object-cover" />{index === 0 && <span className="absolute left-2 top-2 rounded-lg bg-[#17362c]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">Main photo</span>}<span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-[#4c5650] shadow-sm" title="Drag to reorder"><GripVertical className="h-4 w-4" /></span></div>
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
              <label><span className="field-label">Visibility</span><select name="publication_status" defaultValue={initialProperty?.publication_status ?? 'draft'} className={field}>{propertyPublicationStatuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select><span className="mt-2 block text-xs leading-5 text-[#747c77]">Draft and archived listings are hidden from the public website.</span></label>
              <label className="flex items-start gap-3 rounded-xl border border-[#dde2de] p-4"><input name="featured" type="checkbox" defaultChecked={initialProperty?.featured} className="mt-0.5 h-4 w-4 accent-[#24634e]" /><span><span className="block text-sm font-semibold">Featured listing</span><span className="mt-1 block text-xs leading-5 text-[#747c77]">Show this property in featured areas on the public site.</span></span></label>
            </div>
          </section>

          <div className="rounded-2xl bg-[#e5eee9] p-5 text-sm leading-6 text-[#3f5b4f]">Only published listings appear on the public website. Save as draft while details or photos are still being prepared.</div>

          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#24634e] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#1b4f3e] disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? saveProgress?.label ?? 'Saving property…' : 'Save property'}</button>
        </aside>
      </div>
    </form>
  );
}
