import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PropertyBrowser } from '@/components/PropertyBrowser';
import { getProperties } from '@/lib/properties';

export const metadata: Metadata = {
  title: 'Browse Properties',
  description: 'Browse houses, condominiums, land, rentals, commercial properties, and farm lots in Pampanga.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PropertiesPage({ searchParams }: { searchParams: SearchParams }) {
  const [properties, query] = await Promise.all([getProperties(), searchParams]);
  const location = valueOf(query.location) ?? '';

  return (
    <main className="min-h-screen bg-[#f7f6f1] text-[#17362c]">
      <Header />
      <section className="border-b border-[#dfe2dc] bg-[#e9e8e1]">
        <div className="mx-auto max-w-[1440px] px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <p className="eyebrow">DGR Realty collection</p>
          <h1 className="display mt-4 text-5xl tracking-[-0.04em] sm:text-6xl">Find a property that fits.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#66716a]">Explore homes, land, rentals, and investment opportunities. Use the filters to narrow the collection around what matters to you.</p>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
        <PropertyBrowser
          initialProperties={properties}
          initialFilters={{
            query: valueOf(query.query) ?? location,
            category: valueOf(query.category) ?? 'All',
            listingType: valueOf(query.listingType) ?? 'All',
            sort: valueOf(query.sort) ?? 'Newest',
          }}
        />
      </section>
      <Footer />
    </main>
  );
}
