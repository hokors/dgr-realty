import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PropertyBrowser } from '@/components/PropertyBrowser';
import { getProperties } from '@/lib/properties';
import { propertyFilterSchema } from '@/lib/security/validation';

export const metadata: Metadata = {
  title: 'Browse Properties',
  description: 'Browse houses, condominiums, land, rentals, commercial properties, and farm lots in Pampanga.',
  alternates: { canonical: '/properties' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PropertiesPage({ searchParams }: { searchParams: SearchParams }) {
  const [properties, query] = await Promise.all([getProperties(), searchParams]);
  const location = valueOf(query.location) ?? '';
  const parsedFilters = propertyFilterSchema.safeParse({
    query: valueOf(query.query) ?? location,
    category: valueOf(query.category) ?? 'All',
    listingType: valueOf(query.listingType) ?? 'All',
    minPrice: valueOf(query.minPrice) ?? '',
    maxPrice: valueOf(query.maxPrice) ?? '',
    sort: valueOf(query.sort) ?? 'Newest',
  });

  return (
    <main className="min-h-screen bg-[#f8f9f7] text-[#202522]">
      <Header />
      <section className="border-b border-[#e6e9e5] bg-white">
        <div data-reveal className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-14">
          <p className="eyebrow">Properties</p>
          <h1 className="display mt-3 text-4xl tracking-[-0.045em] sm:text-5xl">Browse available properties</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#68716b]">Compare homes, land, rentals, and commercial opportunities across Pampanga.</p>
        </div>
      </section>
      <section data-reveal className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-12">
        <PropertyBrowser
          initialProperties={properties}
          initialFilters={parsedFilters.success ? parsedFilters.data : undefined}
        />
      </section>
      <Footer />
    </main>
  );
}
