import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Check,
  Factory,
  Fence,
  House,
  KeyRound,
  Map,
  MapPin,
  Search,
  Sprout,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PropertyCard } from '@/components/PropertyCard';
import { propertyCategories } from '@/data/sample-properties';
import { getProperties } from '@/lib/properties';

const categoryDetails = [
  { name: 'House', note: 'Family homes and private residences', icon: House },
  { name: 'Condominium', note: 'Easy city living and investments', icon: Building2 },
  { name: 'Lot', note: 'Residential lots ready for your plans', icon: Fence },
  { name: 'Raw Land', note: 'Large parcels for future growth', icon: Map },
  { name: 'Rentals', note: 'Move-in-ready homes and units', icon: KeyRound },
  { name: 'Commercial', note: 'Spaces for business and enterprise', icon: Factory },
  { name: 'Farm Lot', note: 'Agricultural and countryside land', icon: Sprout },
];

export default async function Home() {
  const properties = await getProperties();
  const featured = properties.filter((property) => property.featured).slice(0, 3);
  const recent = [...properties]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-[#f7f6f1] text-[#17362c]">
      <Header overlay />

      <section className="relative isolate min-h-[760px] overflow-hidden bg-[#17362c] text-white lg:min-h-[820px]">
        <Image
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=90"
          alt="Contemporary home surrounded by landscaped greenery"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,31,24,.92)_0%,rgba(9,31,24,.57)_52%,rgba(9,31,24,.18)_100%)]" />
        <div className="relative mx-auto flex min-h-[760px] max-w-[1440px] items-end px-5 pb-16 pt-36 sm:px-8 lg:min-h-[820px] lg:px-12 lg:pb-24">
          <div className="w-full max-w-4xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#d6b66f]">Homes, land &amp; investments</p>
            <h1 className="display max-w-3xl text-5xl leading-[0.94] tracking-[-0.045em] sm:text-7xl lg:text-[86px]">
              Find your place in Pampanga.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
              A carefully curated property collection for buyers, renters, and investors ready to make their next move.
            </p>

            <form action="/properties" className="mt-10 grid max-w-3xl gap-px overflow-hidden rounded-2xl bg-white/15 p-1 shadow-2xl backdrop-blur-md sm:grid-cols-[1.2fr_1fr_auto]">
              <label className="bg-white px-5 py-4 text-[#17362c]">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#758078]"><MapPin className="h-3 w-3" /> Location</span>
                <input name="location" className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-[#68736d]" placeholder="City or area" />
              </label>
              <label className="bg-white px-5 py-4 text-[#17362c]">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#758078]">Property type</span>
                <select name="category" className="mt-1 w-full bg-transparent text-sm outline-none">
                  <option value="All">All properties</option>
                  {propertyCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <button className="flex items-center justify-center gap-2 bg-[#caa75a] px-7 py-4 text-sm font-bold text-[#10271f] transition hover:bg-[#d8bb79]">
                <Search className="h-4 w-4" /> Search
              </button>
            </form>
          </div>
        </div>
        <div className="absolute bottom-7 right-8 hidden items-center gap-3 text-xs text-white/60 lg:flex">
          <span className="h-px w-12 bg-white/40" /> Curated property opportunities
        </div>
      </section>

      <section className="border-b border-[#dfe2dc] bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#e4e6e1] px-5 py-7 sm:px-8 md:grid-cols-4 lg:px-12">
          {[
            ['7', 'Property categories'],
            [`${properties.length}+`, 'Active opportunities'],
            ['Local', 'Market knowledge'],
            ['Direct', 'Personal guidance'],
          ].map(([value, label]) => (
            <div key={label} className="px-4 py-2 text-center first:pl-0 last:pr-0">
              <p className="display text-2xl text-[#17362c] sm:text-3xl">{value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#78827b]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto grid max-w-[1440px] gap-12 px-6 py-24 sm:px-8 md:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-32">
        <div>
          <p className="eyebrow">A better property search</p>
        </div>
        <div>
          <h2 className="display max-w-4xl text-4xl leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            Real estate decisions deserve clarity, local insight, and a more personal approach.
          </h2>
          <div className="mt-8 grid gap-6 text-sm leading-7 text-[#647069] sm:grid-cols-2">
            <p>DGR Realty brings available homes, land, rentals, and commercial opportunities into one organized place—so you can compare confidently and inquire directly.</p>
            <p>Every listing is presented with useful details and an easy next step, whether you are buying your first home, finding a tenant, or planning your next investment.</p>
          </div>
        </div>
      </section>

      <section id="categories" className="bg-[#17362c] py-24 text-white lg:py-28">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12">
          <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-[#d6b66f]">Browse by category</p>
              <h2 className="display mt-4 text-4xl tracking-[-0.035em] sm:text-5xl">What are you looking for?</h2>
            </div>
            <Link href="/properties" className="group flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white">
              View all properties <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid overflow-hidden rounded-[26px] border border-white/15 sm:grid-cols-2 lg:grid-cols-4">
            {categoryDetails.map(({ name, note, icon: Icon }, index) => (
              <Link
                key={name}
                href={`/properties?category=${encodeURIComponent(name)}`}
                className={`group min-h-56 border-white/15 p-7 transition hover:bg-white hover:text-[#17362c] ${index < categoryDetails.length - 1 ? 'border-b sm:border-r lg:border-b' : ''}`}
              >
                <Icon className="h-7 w-7 text-[#d6b66f]" strokeWidth={1.6} />
                <h3 className="mt-14 text-lg font-semibold">{name}</h3>
                <p className="mt-2 max-w-48 text-xs leading-5 text-white/50 transition group-hover:text-[#657069]">{note}</p>
              </Link>
            ))}
            <Link href="/properties" className="group flex min-h-56 flex-col justify-between bg-[#caa75a] p-7 text-[#10271f] transition hover:bg-[#d8bb79]">
              <ArrowRight className="h-7 w-7 self-end transition group-hover:translate-x-1" />
              <div><h3 className="text-lg font-bold">Explore everything</h3><p className="mt-2 text-xs leading-5 opacity-70">See the complete DGR Realty collection.</p></div>
            </Link>
          </div>
        </div>
      </section>

      <section id="properties" className="mx-auto max-w-[1440px] px-6 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Featured collection</p>
            <h2 className="display mt-4 text-4xl tracking-[-0.035em] sm:text-5xl">Properties worth a closer look.</h2>
          </div>
          <Link href="/properties" className="flex items-center gap-2 text-sm font-semibold text-[#17362c]">See all listings <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((property, index) => <PropertyCard key={property.id} property={property} priority={index < 2} />)}
        </div>
      </section>

      <section className="border-y border-[#dfe2dc] bg-white py-24 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div><p className="eyebrow">Just listed</p><h2 className="display mt-4 text-4xl tracking-[-0.035em] sm:text-5xl">Fresh opportunities.</h2></div>
            <Link href="/properties?sort=Newest" className="hidden items-center gap-2 text-sm font-semibold sm:flex">View newest <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {recent.map((property) => <PropertyCard key={property.id} property={property} />)}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-[1440px] px-6 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="relative isolate overflow-hidden rounded-[30px] bg-[#ded8c8] px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
          <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-[#17362c]/10" />
          <div className="absolute -right-4 -top-12 h-52 w-52 rounded-full border border-[#17362c]/10" />
          <div className="relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="eyebrow">Ready when you are</p>
              <h2 className="display mt-4 max-w-3xl text-4xl leading-[1.02] tracking-[-0.04em] sm:text-6xl">Buying, renting, selling, or listing? Let’s talk.</h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-[#5f6a64]">Tell us what you are looking for and we will help you take the next clear step.</p>
            </div>
            <div className="grid gap-3">
              <a href="mailto:inquiries@dgrrealty.example" className="flex items-center justify-between rounded-full bg-[#17362c] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#23483b]">Send an inquiry <ArrowRight className="h-4 w-4" /></a>
              <a href="#" className="flex items-center justify-between rounded-full border border-[#17362c]/30 px-6 py-4 text-sm font-semibold transition hover:bg-white/50">Message us on Facebook <ArrowRight className="h-4 w-4" /></a>
              <p className="mt-3 flex items-center gap-2 text-xs text-[#657069]"><Check className="h-4 w-4" /> No pressure—just clear, helpful guidance.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
