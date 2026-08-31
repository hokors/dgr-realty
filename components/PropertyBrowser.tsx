'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { propertyCategories } from '@/data/sample-properties';
import type { Property } from '@/lib/types';
import { PropertyCard } from '@/components/PropertyCard';

type Filters = {
  query: string;
  category: string;
  listingType: string;
  location: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  sort: string;
};

const defaults: Filters = {
  query: '',
  category: 'All',
  listingType: 'All',
  location: 'All',
  minPrice: '',
  maxPrice: '',
  bedrooms: 'Any',
  bathrooms: 'Any',
  sort: 'Newest',
};

export function PropertyBrowser({ initialProperties, initialFilters = {} }: { initialProperties: Property[]; initialFilters?: Partial<Filters> }) {
  const [filters, setFilters] = useState<Filters>({ ...defaults, ...initialFilters });
  const [showFilters, setShowFilters] = useState(false);

  const cities = useMemo(() => Array.from(new Set(initialProperties.map((property) => property.city))).sort(), [initialProperties]);

  const properties = useMemo(() => {
    const minPrice = filters.minPrice ? Number(filters.minPrice) : 0;
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : Number.POSITIVE_INFINITY;
    const filtered = initialProperties.filter((property) => {
      const haystack = `${property.title} ${property.location} ${property.city} ${property.province}`.toLowerCase();
      return (
        (!filters.query || haystack.includes(filters.query.toLowerCase()))
        && (filters.category === 'All' || property.category === filters.category)
        && (filters.listingType === 'All' || property.listingType === filters.listingType)
        && (filters.location === 'All' || property.city === filters.location)
        && (filters.bedrooms === 'Any' || (property.bedrooms ?? 0) >= Number(filters.bedrooms))
        && (filters.bathrooms === 'Any' || (property.bathrooms ?? 0) >= Number(filters.bathrooms))
        && property.price >= minPrice
        && property.price <= maxPrice
      );
    });

    return filtered.sort((a, b) => {
      if (filters.sort === 'Price: Low to High') return a.price - b.price;
      if (filters.sort === 'Price: High to Low') return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filters, initialProperties]);

  const set = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const filterKeys: Array<keyof Filters> = ['category', 'listingType', 'location', 'minPrice', 'maxPrice', 'bedrooms', 'bathrooms'];
  const activeCount = filterKeys.filter((key) => filters[key] !== defaults[key]).length;
  const controlClass = 'h-12 w-full rounded-xl border border-[#dfe3df] bg-white px-3 text-sm text-[#252a27] outline-none transition focus:border-[#24634e] focus:ring-2 focus:ring-[#24634e]/10';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block flex-1 lg:max-w-xl">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#747c77]" />
          <span className="sr-only">Search properties</span>
          <input value={filters.query} onChange={(event) => set('query', event.target.value)} placeholder="Search by property, city, or location" className="h-12 w-full rounded-xl border border-[#dfe3df] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#24634e] focus:ring-2 focus:ring-[#24634e]/10" />
        </label>
        <div className="flex gap-3">
          <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#dfe3df] bg-white px-4 text-sm font-semibold lg:hidden">
            <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#24634e] px-1 text-[10px] text-white">{activeCount}</span>}
          </button>
          <label className="min-w-48 flex-1 lg:flex-none"><span className="sr-only">Sort properties</span><select value={filters.sort} onChange={(event) => set('sort', event.target.value)} className={controlClass}><option>Newest</option><option>Price: Low to High</option><option>Price: High to Low</option></select></label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={`${showFilters ? 'block' : 'hidden'} rounded-2xl border border-[#e1e5e1] bg-white p-5 lg:sticky lg:top-24 lg:block lg:self-start`}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-bold">Filters</h2>
            {activeCount > 0 && <button type="button" onClick={() => setFilters((current) => ({ ...defaults, query: current.query, sort: current.sort }))} className="flex items-center gap-1 text-xs font-semibold text-[#24634e]"><X className="h-3.5 w-3.5" /> Clear</button>}
          </div>
          <div className="space-y-5">
            {[
              { label: 'Sale or rent', key: 'listingType', options: ['All', 'For Sale', 'For Rent'] },
              { label: 'Category', key: 'category', options: ['All', ...propertyCategories] },
              { label: 'Location', key: 'location', options: ['All', ...cities] },
            ].map(({ label, key, options }) => (
              <label key={key} className="block"><span className="field-label">{label}</span><select value={filters[key as keyof Filters]} onChange={(event) => set(key as keyof Filters, event.target.value)} className={controlClass}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
            ))}
            <div>
              <span className="field-label">Price range</span>
              <div className="grid grid-cols-2 gap-2">
                <label><span className="sr-only">Minimum price</span><input type="number" min="0" value={filters.minPrice} onChange={(event) => set('minPrice', event.target.value)} placeholder="Min price" className={controlClass} /></label>
                <label><span className="sr-only">Maximum price</span><input type="number" min="0" value={filters.maxPrice} onChange={(event) => set('maxPrice', event.target.value)} placeholder="Max price" className={controlClass} /></label>
              </div>
            </div>
            {[
              { label: 'Bedrooms', key: 'bedrooms', options: ['Any', '1', '2', '3', '4'] },
              { label: 'Bathrooms', key: 'bathrooms', options: ['Any', '1', '2', '3', '4'] },
            ].map(({ label, key, options }) => (
              <label key={key} className="block"><span className="field-label">{label}</span><select value={filters[key as keyof Filters]} onChange={(event) => set(key as keyof Filters, event.target.value)} className={controlClass}>{options.map((option) => <option key={option}>{option === 'Any' ? 'Any' : `${option}+`}</option>)}</select></label>
            ))}
          </div>
        </aside>

        <div>
          <div className="mb-5 flex items-center justify-between"><p className="text-sm text-[#69716c]"><strong className="text-[#202522]">{properties.length}</strong> {properties.length === 1 ? 'property' : 'properties'} found</p></div>
          {properties.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{properties.map((property, index) => <PropertyCard key={property.id} property={property} priority={index < 3} />)}</div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d6dbd7] bg-white px-6 py-20 text-center"><p className="display text-3xl text-[#202522]">No matching properties yet.</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#69716c]">Try widening your location, price, or room filters. New listings are added regularly.</p><button type="button" onClick={() => setFilters(defaults)} className="mt-6 rounded-xl bg-[#24634e] px-5 py-3 text-sm font-semibold text-white">Reset filters</button></div>
          )}
        </div>
      </div>
    </div>
  );
}
