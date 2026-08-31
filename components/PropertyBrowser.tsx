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
  price: string;
  bedrooms: string;
  bathrooms: string;
  sort: string;
};

const defaults: Filters = {
  query: '',
  category: 'All',
  listingType: 'All',
  location: 'All',
  price: 'All',
  bedrooms: 'Any',
  bathrooms: 'Any',
  sort: 'Newest',
};

export function PropertyBrowser({
  initialProperties,
  initialFilters = {},
}: {
  initialProperties: Property[];
  initialFilters?: Partial<Filters>;
}) {
  const [filters, setFilters] = useState<Filters>({ ...defaults, ...initialFilters });
  const [showFilters, setShowFilters] = useState(false);

  const cities = useMemo(
    () => Array.from(new Set(initialProperties.map((property) => property.city))).sort(),
    [initialProperties],
  );

  const properties = useMemo(() => {
    const priceRanges: Record<string, [number, number]> = {
      'Under ₱5M': [0, 5000000],
      '₱5M–₱10M': [5000000, 10000000],
      '₱10M–₱20M': [10000000, 20000000],
      '₱20M and above': [20000000, Number.POSITIVE_INFINITY],
    };

    const filtered = initialProperties.filter((property) => {
      const haystack = `${property.title} ${property.location} ${property.city} ${property.province}`.toLowerCase();
      const matchesQuery = !filters.query || haystack.includes(filters.query.toLowerCase());
      const matchesCategory = filters.category === 'All' || property.category === filters.category;
      const matchesType = filters.listingType === 'All' || property.listingType === filters.listingType;
      const matchesLocation = filters.location === 'All' || property.city === filters.location;
      const matchesBedrooms = filters.bedrooms === 'Any' || (property.bedrooms ?? 0) >= Number(filters.bedrooms);
      const matchesBathrooms = filters.bathrooms === 'Any' || (property.bathrooms ?? 0) >= Number(filters.bathrooms);
      const range = priceRanges[filters.price];
      const matchesPrice = !range || (property.price >= range[0] && property.price < range[1]);
      return matchesQuery && matchesCategory && matchesType && matchesLocation && matchesBedrooms && matchesBathrooms && matchesPrice;
    });

    return filtered.sort((a, b) => {
      if (filters.sort === 'Price: Low to High') return a.price - b.price;
      if (filters.sort === 'Price: High to Low') return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filters, initialProperties]);

  const set = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const activeCount = Object.entries(filters).filter(([key, value]) => value !== defaults[key as keyof Filters]).length;

  const selectClass = 'h-12 w-full rounded-xl border border-[#d9ddd6] bg-white px-3 text-sm text-[#17362c] outline-none transition focus:border-[#17362c] focus:ring-2 focus:ring-[#17362c]/10';

  return (
    <div>
      <div className="mb-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block flex-1 lg:max-w-xl">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e7771]" />
          <span className="sr-only">Search properties</span>
          <input
            value={filters.query}
            onChange={(event) => set('query', event.target.value)}
            placeholder="Search by property or location"
            className="h-13 w-full rounded-xl border border-[#d9ddd6] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#17362c] focus:ring-2 focus:ring-[#17362c]/10"
          />
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters((value) => !value)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#cfd4cd] bg-white px-4 text-sm font-semibold lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && `(${activeCount})`}
          </button>
          <label className="flex min-w-52 flex-1 items-center gap-2 lg:flex-none">
            <span className="sr-only">Sort properties</span>
            <select value={filters.sort} onChange={(event) => set('sort', event.target.value)} className={selectClass}>
              <option>Newest</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className={`${showFilters ? 'block' : 'hidden'} rounded-2xl border border-[#dfe2dc] bg-white p-5 lg:block lg:self-start`}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Filter properties</h2>
            {activeCount > 0 && (
              <button onClick={() => setFilters(defaults)} className="flex items-center gap-1 text-xs font-semibold text-[#7d6a38] hover:text-[#17362c]">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
          <div className="space-y-4">
            {[
              { label: 'Category', key: 'category', options: ['All', ...propertyCategories] },
              { label: 'Listing type', key: 'listingType', options: ['All', 'For Sale', 'For Rent'] },
              { label: 'Location', key: 'location', options: ['All', ...cities] },
              { label: 'Price range', key: 'price', options: ['All', 'Under ₱5M', '₱5M–₱10M', '₱10M–₱20M', '₱20M and above'] },
              { label: 'Bedrooms', key: 'bedrooms', options: ['Any', '1', '2', '3', '4'] },
              { label: 'Bathrooms', key: 'bathrooms', options: ['Any', '1', '2', '3', '4'] },
            ].map(({ label, key, options }) => (
              <label key={key} className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#6e7771]">{label}</span>
                <select value={filters[key as keyof Filters]} onChange={(event) => set(key as keyof Filters, event.target.value)} className={selectClass}>
                  {options.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>
        </aside>

        <div>
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-[#66716a]"><strong className="text-[#17362c]">{properties.length}</strong> {properties.length === 1 ? 'property' : 'properties'} found</p>
          </div>
          {properties.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {properties.map((property, index) => <PropertyCard key={property.id} property={property} priority={index < 3} />)}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#cfd4cd] bg-white px-6 py-20 text-center">
              <p className="display text-3xl text-[#17362c]">No exact matches yet.</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#66716a]">Try widening the location, price, or room filters. New properties are added regularly.</p>
              <button onClick={() => setFilters(defaults)} className="mt-6 rounded-full bg-[#17362c] px-5 py-3 text-sm font-semibold text-white">Reset filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
