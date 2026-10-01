'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Banknote, Bath, BedDouble, Check, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
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

const roomOptions = ['Any', '1', '2', '3', '4'];

function compactPrice(value: string) {
  if (!value) return '';
  return new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));
}

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
  const clearAll = () => setFilters((current) => ({ ...defaults, query: current.query, sort: current.sort }));

  const activeChips = [
    filters.listingType !== 'All' ? { key: 'listingType', label: filters.listingType === 'For Sale' ? 'For sale' : 'For rent', clear: () => set('listingType', 'All') } : null,
    filters.category !== 'All' ? { key: 'category', label: filters.category, clear: () => set('category', 'All') } : null,
    filters.location !== 'All' ? { key: 'location', label: filters.location, clear: () => set('location', 'All') } : null,
    filters.minPrice || filters.maxPrice ? { key: 'price', label: `₱${filters.minPrice ? compactPrice(filters.minPrice) : '0'} – ${filters.maxPrice ? `₱${compactPrice(filters.maxPrice)}` : 'Any'}`, clear: () => setFilters((current) => ({ ...current, minPrice: '', maxPrice: '' })) } : null,
    filters.bedrooms !== 'Any' ? { key: 'bedrooms', label: `${filters.bedrooms}+ beds`, clear: () => set('bedrooms', 'Any') } : null,
    filters.bathrooms !== 'Any' ? { key: 'bathrooms', label: `${filters.bathrooms}+ baths`, clear: () => set('bathrooms', 'Any') } : null,
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => Boolean(chip));

  const inputClass = 'h-12 w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 text-sm text-[var(--brand-text)] outline-none transition placeholder:text-[var(--brand-muted)] focus:border-[var(--brand-secondary-strong)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-secondary-strong)]/8';

  return (
    <div>
      <section aria-label="Property filters" className="rounded-2xl border border-[var(--brand-border)] bg-white p-3 shadow-[0_10px_32px_rgba(3,27,43,0.07)] sm:p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(300px,1fr)_auto_auto_auto] xl:items-center">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]" />
            <span className="sr-only">Search properties</span>
            <input value={filters.query} onChange={(event) => set('query', event.target.value)} placeholder="Search a property, city, or neighborhood" className="h-13 w-full rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-background)] pl-11 pr-10 text-sm outline-none transition focus:border-[var(--brand-secondary-strong)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-secondary-strong)]/8" />
            {filters.query && <button type="button" onClick={() => set('query', '')} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[var(--brand-muted)] hover:bg-[var(--brand-surface-muted)]" aria-label="Clear search"><X className="h-3.5 w-3.5" /></button>}
          </label>

          <div className="grid grid-cols-3 rounded-2xl bg-[var(--brand-surface-muted)] p-1" aria-label="Listing type">
            {[['All', 'All'], ['For Sale', 'Buy'], ['For Rent', 'Rent']].map(([value, label]) => (
              <button key={value} type="button" onClick={() => set('listingType', value)} aria-pressed={filters.listingType === value} className={`min-h-11 rounded-xl px-4 text-xs font-bold transition ${filters.listingType === value ? 'bg-white text-[var(--brand-secondary-strong)] shadow-sm' : 'text-[var(--brand-muted)] hover:text-[var(--brand-text)]'}`}>{filters.listingType === value && <Check className="mr-1.5 inline h-3.5 w-3.5" />}{label}</button>
            ))}
          </div>

          <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} className={`flex h-13 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold transition ${showFilters || activeCount > 0 ? 'border-[var(--brand-border-strong)] bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary-strong)]' : 'border-[var(--brand-border)] bg-white text-[var(--brand-text)] hover:bg-[var(--brand-background)]'}`}>
            <SlidersHorizontal className="h-4 w-4" /> More filters {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--brand-secondary-strong)] px-1 text-[10px] text-white">{activeCount}</span>}
          </button>

          <label className="relative min-w-52"><span className="sr-only">Sort properties</span><ArrowUpDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]" /><select value={filters.sort} onChange={(event) => set('sort', event.target.value)} className="h-13 w-full appearance-none rounded-2xl border border-[var(--brand-border)] bg-white pl-11 pr-8 text-sm font-semibold text-[var(--brand-text)] outline-none hover:bg-[var(--brand-background)] focus:border-[var(--brand-secondary-strong)]"><option>Newest</option><option>Price: Low to High</option><option>Price: High to Low</option></select></label>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Property categories">
          {['All', ...propertyCategories].map((category) => (
            <button key={category} type="button" onClick={() => set('category', category)} aria-pressed={filters.category === category} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${filters.category === category ? 'border-[var(--brand-secondary-strong)] bg-[var(--brand-secondary-strong)] text-white shadow-sm' : 'border-[var(--brand-border)] bg-white text-[var(--brand-muted)] hover:border-[var(--brand-border-strong)] hover:bg-[var(--brand-secondary-soft)] hover:text-[var(--brand-secondary-strong)]'}`}>{category === 'All' ? 'All properties' : category}</button>
          ))}
        </div>

        {showFilters && (
          <div className="mt-4 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-background)] p-4 sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
              <div>
                <span className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--brand-text)]"><MapPin className="h-4 w-4 text-[var(--brand-secondary-strong)]" /> Location</span>
                <label><span className="sr-only">Choose a city</span><select value={filters.location} onChange={(event) => set('location', event.target.value)} className={inputClass}><option value="All">All locations</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
              </div>

              <div>
                <span className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--brand-text)]"><Banknote className="h-4 w-4 text-[var(--brand-secondary-strong)]" /> Price range</span>
                <div className="grid grid-cols-2 gap-2"><label><span className="sr-only">Minimum price</span><input type="number" min="0" value={filters.minPrice} onChange={(event) => set('minPrice', event.target.value)} placeholder="Minimum" className={inputClass} /></label><label><span className="sr-only">Maximum price</span><input type="number" min="0" value={filters.maxPrice} onChange={(event) => set('maxPrice', event.target.value)} placeholder="Maximum" className={inputClass} /></label></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {[{ label: 'Bedrooms', key: 'bedrooms' as const, icon: BedDouble }, { label: 'Bathrooms', key: 'bathrooms' as const, icon: Bath }].map(({ label, key, icon: Icon }) => (
                  <div key={key}><span className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--brand-text)]"><Icon className="h-4 w-4 text-[var(--brand-secondary-strong)]" /> {label}</span><div className="flex rounded-xl border border-[var(--brand-border)] bg-white p-1">{roomOptions.map((option) => <button key={option} type="button" onClick={() => set(key, option)} aria-pressed={filters[key] === option} className={`h-10 min-w-10 flex-1 rounded-lg px-2 text-xs font-bold transition ${filters[key] === option ? 'bg-[var(--brand-secondary-strong)] text-white' : 'text-[var(--brand-muted)] hover:bg-[var(--brand-surface-muted)]'}`}>{option === 'Any' ? 'Any' : `${option}+`}</button>)}</div></div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[var(--brand-border)] pt-4">
              <button type="button" onClick={clearAll} disabled={activeCount === 0} className="text-xs font-bold text-[var(--brand-muted)] disabled:opacity-40">Reset filters</button>
              <button type="button" onClick={() => setShowFilters(false)} className="rounded-xl bg-[var(--brand-secondary-strong)] px-5 py-2.5 text-xs font-bold text-white">Show {properties.length} {properties.length === 1 ? 'property' : 'properties'}</button>
            </div>
          </div>
        )}
      </section>

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3"><p className="shrink-0 text-sm text-[var(--brand-muted)]"><strong className="text-[var(--brand-text)]">{properties.length}</strong> {properties.length === 1 ? 'property' : 'properties'} found</p>{activeChips.length > 0 && <div className="flex gap-2 overflow-x-auto">{activeChips.map((chip) => <button key={chip.key} type="button" onClick={chip.clear} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--brand-secondary-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--brand-secondary-strong)]">{chip.label}<X className="h-3 w-3" /></button>)}</div>}</div>
        {activeCount > 0 && <button type="button" onClick={clearAll} className="hidden shrink-0 text-xs font-bold text-[var(--brand-muted)] hover:text-[var(--brand-secondary-strong)] sm:block">Clear all</button>}
      </div>

      {properties.length > 0 ? (
        <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{properties.map((property, index) => <PropertyCard key={property.id} property={property} priority={index < 4} />)}</div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--brand-border-strong)] bg-white px-6 py-20 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-surface-muted)] text-[var(--brand-secondary-strong)]"><Search className="h-5 w-5" /></div><p className="display mt-5 text-3xl text-[var(--brand-text)]">No matching properties yet.</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--brand-muted)]">Try widening your location, price, or room filters. New listings are added regularly.</p><button type="button" onClick={() => setFilters(defaults)} className="mt-6 rounded-xl bg-[var(--brand-secondary-strong)] px-5 py-3 text-sm font-semibold text-white">Reset all filters</button></div>
      )}
    </div>
  );
}
