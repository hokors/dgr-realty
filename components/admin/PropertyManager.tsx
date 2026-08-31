'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Edit3, LoaderCircle, Plus, Search, Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/format';
import { propertyStatuses } from '@/lib/admin/types';
import type { PropertyStatus } from '@/lib/types';

export type PropertyManagerRow = {
  id: string;
  title: string;
  slug: string;
  price: number;
  listing_type: string;
  status: PropertyStatus;
  featured: boolean;
  city: string;
  property_categories: { name: string } | null;
  property_images: Array<{ id: string; storage_path: string | null }>;
};

export function PropertyManager({ initialProperties }: { initialProperties: PropertyManagerRow[] }) {
  const router = useRouter();
  const [properties, setProperties] = useState(initialProperties);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [listingType, setListingType] = useState('All');
  const [message, setMessage] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return properties.filter((property) => {
      const matchesQuery = !normalized || [property.title, property.city, property.property_categories?.name].some((value) => value?.toLowerCase().includes(normalized));
      return matchesQuery && (status === 'All' || property.status === status) && (listingType === 'All' || property.listing_type === listingType);
    });
  }, [listingType, properties, query, status]);

  async function updateProperty(id: string, updates: { status?: PropertyStatus; featured?: boolean }) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setWorkingId(id);
    setMessage('');
    const { error } = await supabase.from('properties').update(updates).eq('id', id);
    if (error) setMessage(error.message);
    else setProperties((rows) => rows.map((row) => row.id === id ? { ...row, ...updates } : row));
    setWorkingId(null);
    router.refresh();
  }

  async function deleteProperty(property: PropertyManagerRow) {
    if (!window.confirm(`Delete “${property.title}” and all of its property photos? This cannot be undone.`)) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setWorkingId(property.id);
    setMessage('');

    const paths = property.property_images.map((image) => image.storage_path).filter((path): path is string => Boolean(path));
    if (paths.length > 0) await supabase.storage.from('property-images').remove(paths);

    const { error } = await supabase.from('properties').delete().eq('id', property.id);
    if (error) setMessage(error.message);
    else {
      setProperties((rows) => rows.filter((row) => row.id !== property.id));
      setMessage('Property deleted.');
      router.refresh();
    }
    setWorkingId(null);
  }

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Inventory</p><h1 className="display mt-3 text-4xl tracking-[-0.045em] sm:text-5xl">Properties</h1><p className="mt-3 text-sm text-[#68716b]">Search, filter, and update every DGR Realty listing.</p></div>
        <Link href="/admin/properties/new" className="flex items-center justify-center gap-2 self-start rounded-xl bg-[#24634e] px-5 py-3 text-sm font-bold text-white hover:bg-[#1b4f3e]"><Plus className="h-4 w-4" /> Add property</Link>
      </div>

      <div className="mt-8 grid gap-3 rounded-2xl border border-[#dde2de] bg-white p-4 md:grid-cols-[minmax(0,1fr)_190px_190px]">
        <label className="relative"><span className="sr-only">Search listings</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b837e]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, category, or city" className="form-field pl-11" /></label>
        <label><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="form-field"><option>All</option>{propertyStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span className="sr-only">Filter by listing type</span><select value={listingType} onChange={(event) => setListingType(event.target.value)} className="form-field"><option>All</option><option>For Sale</option><option>For Rent</option></select></label>
      </div>

      {message && <p className="mt-4 rounded-xl bg-[#e6eee9] px-4 py-3 text-sm text-[#305b49]" role="status">{message}</p>}

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#dde2de] bg-white">
        <div className="border-b border-[#e7eae7] px-5 py-4 text-xs font-semibold text-[#707873]">{filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}</div>
        {filtered.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[#707873]">No listings match these filters.</p> : (
          <div className="divide-y divide-[#edf0ed]">
            {filtered.map((property) => (
              <article key={property.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(240px,1fr)_130px_170px_110px_auto] lg:items-center">
                <div className="min-w-0"><p className="truncate font-semibold">{property.title}</p><p className="mt-1 text-xs text-[#747c77]">{property.property_categories?.name ?? 'Uncategorized'} · {property.city} · {property.listing_type}</p></div>
                <p className="text-sm font-bold">{formatPrice(Number(property.price))}</p>
                <label><span className="sr-only">Status for {property.title}</span><select value={property.status} disabled={workingId === property.id} onChange={(event) => updateProperty(property.id, { status: event.target.value as PropertyStatus })} className="h-10 w-full rounded-xl border border-[#d9ddd6] bg-white px-3 text-xs"><option disabled>Status</option>{propertyStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
                <button type="button" disabled={workingId === property.id} onClick={() => updateProperty(property.id, { featured: !property.featured })} className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold ${property.featured ? 'border-[#d4b873] bg-[#f5edda] text-[#826825]' : 'border-[#d9ddd6] text-[#6f7772]'}`}><Star className="h-3.5 w-3.5" fill={property.featured ? 'currentColor' : 'none'} /> {property.featured ? 'Featured' : 'Feature'}</button>
                <div className="flex items-center justify-end gap-2">
                  {workingId === property.id && <LoaderCircle className="mr-1 h-4 w-4 animate-spin text-[#6d756f]" />}
                  <Link href={`/admin/properties/${property.id}/edit`} title="Edit property" className="grid h-10 w-10 place-items-center rounded-xl border border-[#d9ddd6] text-[#3f4943] hover:bg-[#f2f4f2]"><Edit3 className="h-4 w-4" /></Link>
                  <button type="button" onClick={() => deleteProperty(property)} disabled={workingId === property.id} title="Delete property" className="grid h-10 w-10 place-items-center rounded-xl border border-[#e4c9c6] text-[#9a423b] hover:bg-[#fbefed]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
