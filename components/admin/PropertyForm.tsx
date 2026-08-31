'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, LoaderCircle, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { adminCategories, propertyStatuses, type AdminCategory, type AdminImage, type AdminProperty } from '@/lib/admin/types';

type ExistingImageItem = { kind: 'existing'; key: string; image: AdminImage; previewUrl: string };
type NewImageItem = { kind: 'new'; key: string; file: File; previewUrl: string };
type ImageItem = ExistingImageItem | NewImageItem;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'property';
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function createUniqueSlug(title: string) {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  const base = slugify(title);
  const { data, error } = await supabase.from('properties').select('slug').like('slug', `${base}%`);
  if (error) throw error;
  const existing = new Set((data ?? []).map((row) => row.slug as string));
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function safeFileName(name: string) {
  const extension = name.includes('.') ? `.${name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
  const base = name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'property-photo';
  return `${base}${extension}`;
}

export function PropertyForm({ categories, initialProperty }: { categories: AdminCategory[]; initialProperty?: AdminProperty }) {
  const router = useRouter();
  const isEditing = Boolean(initialProperty);
  const initialImages = useMemo<ImageItem[]>(() => [...(initialProperty?.property_images ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((image) => ({ kind: 'existing', key: image.id, image, previewUrl: image.image_url })), [initialProperty]);
  const [images, setImages] = useState<ImageItem[]>(initialImages);
  const [removedImages, setRemovedImages] = useState<AdminImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allowedCategories = categories.filter((category) => adminCategories.includes(category.name as (typeof adminCategories)[number]));
  const amenities = initialProperty?.property_amenities.map((item) => item.amenities?.name).filter((name): name is string => Boolean(name)).join(', ') ?? '';

  function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const accepted = files.filter((file) => file.type.startsWith('image/'));
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

  function removeImage(index: number) {
    setImages((current) => {
      const item = current[index];
      if (item.kind === 'existing') setRemovedImages((removed) => [...removed, item.image]);
      else URL.revokeObjectURL(item.previewUrl);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function saveAmenities(propertyId: string, rawAmenities: string) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured.');
    const names = Array.from(new Set(rawAmenities.split(/[,\n]/).map((item) => item.trim()).filter(Boolean)));
    const { error: clearError } = await supabase.from('property_amenities').delete().eq('property_id', propertyId);
    if (clearError) throw clearError;
    if (names.length === 0) return;

    const amenityRows = names.map((name) => ({ name, slug: slugify(name) }));
    const { error: amenityError } = await supabase.from('amenities').upsert(amenityRows, { onConflict: 'slug', ignoreDuplicates: true });
    if (amenityError) throw amenityError;
    const { data: savedAmenities, error: loadError } = await supabase.from('amenities').select('id, slug').in('slug', amenityRows.map((row) => row.slug));
    if (loadError) throw loadError;
    const { error: linkError } = await supabase.from('property_amenities').insert((savedAmenities ?? []).map((amenity) => ({ property_id: propertyId, amenity_id: amenity.id })));
    if (linkError) throw linkError;
  }

  async function saveImages(propertyId: string, title: string) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured.');

    const removedPaths = removedImages.map((image) => image.storage_path).filter((path): path is string => Boolean(path));
    if (removedPaths.length > 0) {
      const { error: storageError } = await supabase.storage.from('property-images').remove(removedPaths);
      if (storageError) throw storageError;
    }
    if (removedImages.length > 0) {
      const { error: deleteError } = await supabase.from('property_images').delete().in('id', removedImages.map((image) => image.id));
      if (deleteError) throw deleteError;
    }

    const existing = images.filter((item): item is ExistingImageItem => item.kind === 'existing');
    for (let index = 0; index < existing.length; index += 1) {
      const { error: temporaryOrderError } = await supabase.from('property_images').update({ display_order: -(index + 1) }).eq('id', existing[index].image.id);
      if (temporaryOrderError) throw temporaryOrderError;
    }

    for (let index = 0; index < images.length; index += 1) {
      const item = images[index];
      if (item.kind === 'existing') {
        const { error: orderError } = await supabase.from('property_images').update({ display_order: index, alt_text: item.image.alt_text || title }).eq('id', item.image.id);
        if (orderError) throw orderError;
        continue;
      }

      const path = `${propertyId}/${crypto.randomUUID()}-${safeFileName(item.file.name)}`;
      const { error: uploadError } = await supabase.storage.from('property-images').upload(path, item.file, { contentType: item.file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicImage } = supabase.storage.from('property-images').getPublicUrl(path);
      const { error: imageError } = await supabase.from('property_images').insert({
        property_id: propertyId,
        image_url: publicImage.publicUrl,
        storage_path: path,
        display_order: index,
        alt_text: title,
      });
      if (imageError) {
        await supabase.storage.from('property-images').remove([path]);
        throw imageError;
      }
    }
  }

  async function saveProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error('Supabase environment variables are not configured.');
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Your session expired. Please sign in again.');

      const form = new FormData(event.currentTarget);
      const title = String(form.get('title') ?? '').trim();
      const slug = initialProperty?.slug ?? await createUniqueSlug(title);
      const payload = {
        title,
        slug,
        description: String(form.get('description') ?? '').trim(),
        category_id: String(form.get('category_id') ?? ''),
        listing_type: String(form.get('listing_type') ?? 'For Sale'),
        price: Number(form.get('price') ?? 0),
        price_suffix: String(form.get('price_suffix') ?? '').trim() || null,
        location: String(form.get('location') ?? '').trim(),
        city: String(form.get('city') ?? '').trim(),
        province: String(form.get('province') ?? '').trim(),
        bedrooms: optionalNumber(form.get('bedrooms')),
        bathrooms: optionalNumber(form.get('bathrooms')),
        parking_spaces: optionalNumber(form.get('parking_spaces')),
        lot_area: optionalNumber(form.get('lot_area')),
        floor_area: optionalNumber(form.get('floor_area')),
        status: String(form.get('status') ?? 'Available'),
        featured: form.get('featured') === 'on',
      };

      let propertyId = initialProperty?.id;
      if (propertyId) {
        const { error: updateError } = await supabase.from('properties').update(payload).eq('id', propertyId);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase.from('properties').insert({ ...payload, created_by: authData.user.id }).select('id').single();
        if (insertError || !inserted) throw insertError ?? new Error('Unable to create the property.');
        propertyId = inserted.id;
      }

      if (!propertyId) throw new Error('Unable to identify the saved property.');
      await saveAmenities(propertyId, String(form.get('amenities') ?? ''));
      await saveImages(propertyId, title);
      router.push('/admin/properties');
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this property.');
      setSaving(false);
    }
  }

  const field = 'form-field';

  return (
    <form onSubmit={saveProperty}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><Link href="/admin/properties" className="flex items-center gap-2 text-xs font-bold text-[#24634e]"><ArrowLeft className="h-3.5 w-3.5" /> Back to properties</Link><h1 className="display mt-4 text-4xl tracking-[-0.045em] sm:text-5xl">{isEditing ? 'Edit property' : 'Add property'}</h1><p className="mt-3 text-sm text-[#68716b]">{isEditing ? 'Update listing details and property photos.' : 'Create a new listing for the public marketplace.'}</p></div>
        <button disabled={saving} className="flex items-center justify-center gap-2 self-start rounded-xl bg-[#24634e] px-5 py-3 text-sm font-bold text-white hover:bg-[#1b4f3e] disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'Saving…' : 'Save property'}</button>
      </div>

      {error && <p className="mt-5 rounded-xl bg-[#fae8e6] px-4 py-3 text-sm text-[#923f38]" role="alert">{error}</p>}

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Property photos</h2><p className="mt-1 text-xs text-[#747c77]">The first image is used as the main listing photo.</p></div><label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfd6d1] bg-white px-4 py-2.5 text-xs font-bold text-[#24634e] hover:bg-[#f1f5f2]"><ImagePlus className="h-4 w-4" /> Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={addImages} className="absolute inset-0 cursor-pointer opacity-0" /></label></div>
            {images.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-[#cfd6d1] px-6 py-14 text-center"><ImagePlus className="mx-auto h-6 w-6 text-[#8a938d]" /><p className="mt-3 text-sm font-semibold">No photos selected</p><p className="mt-1 text-xs text-[#7a827d]">Add JPG, PNG, WebP, or AVIF files.</p></div> : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((item, index) => (
                  <div key={item.key} className="overflow-hidden rounded-xl border border-[#dde2de] bg-[#f5f6f4]">
                    <div className="relative aspect-[4/3] bg-[#e5e8e5]"><Image src={item.previewUrl} alt={`${initialProperty?.title ?? 'New property'} preview ${index + 1}`} fill unoptimized sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />{index === 0 && <span className="absolute left-2 top-2 rounded-lg bg-[#17362c]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">Main photo</span>}</div>
                    <div className="flex items-center justify-between gap-2 p-2"><span className="pl-1 text-xs font-semibold text-[#68716b]">Photo {index + 1}</span><div className="flex gap-1"><button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Move photo earlier" className="grid h-8 w-8 place-items-center rounded-lg border border-[#d8ddd9] bg-white disabled:opacity-35"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} aria-label="Move photo later" className="grid h-8 w-8 place-items-center rounded-lg border border-[#d8ddd9] bg-white disabled:opacity-35"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => removeImage(index)} aria-label="Delete photo" className="grid h-8 w-8 place-items-center rounded-lg border border-[#e4cbc8] bg-white text-[#98453e]"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
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
              <label><span className="field-label">Status</span><select name="status" defaultValue={initialProperty?.status ?? 'Available'} className={field}>{propertyStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="flex items-start gap-3 rounded-xl border border-[#dde2de] p-4"><input name="featured" type="checkbox" defaultChecked={initialProperty?.featured} className="mt-0.5 h-4 w-4 accent-[#24634e]" /><span><span className="block text-sm font-semibold">Featured listing</span><span className="mt-1 block text-xs leading-5 text-[#747c77]">Show this property in featured areas on the public site.</span></span></label>
            </div>
          </section>

          <div className="rounded-2xl bg-[#e5eee9] p-5 text-sm leading-6 text-[#3f5b4f]">Saving publishes the latest information immediately. Public property pages always load current Supabase data.</div>

          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#24634e] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#1b4f3e] disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'Saving property…' : 'Save property'}</button>
        </aside>
      </div>
    </form>
  );
}
