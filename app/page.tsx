import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Award,
  ArrowRight,
  Handshake,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  MessagesSquare,
  Phone,
  Search,
} from 'lucide-react';
import agentPhoto from '@/1wep1bv5mdrg80d0m38t9xccvm_result_0.jpg';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { InquiryForm } from '@/components/InquiryForm';
import { PropertyCard } from '@/components/PropertyCard';
import { propertyCategories } from '@/data/sample-properties';
import { getPublicContactDetails } from '@/lib/contact';
import { getProperties } from '@/lib/properties';

// Property data comes from Supabase when configured. Render at request time so
// deployments never depend on an external database during the build step.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const categoryDetails = [
  { name: 'House', label: 'Houses' },
  { name: 'Condominium', label: 'Condominiums' },
  { name: 'Lot', label: 'Residential Lots' },
  { name: 'Raw Land', label: 'Raw Land' },
  { name: 'Rentals', label: 'Rentals' },
  { name: 'Commercial', label: 'Commercial' },
  { name: 'Farm Lot', label: 'Farm Lots' },
];

const agentValueProps = [
  { label: '19 Years of Experience', Icon: Award },
  { label: 'Local Market Expertise', Icon: MapPinned },
  { label: 'Search-to-Closing Support', Icon: Handshake },
  { label: 'Clear Communication', Icon: MessagesSquare },
];

export default async function Home() {
  const properties = await getProperties();
  const contact = getPublicContactDetails();
  const selectedFeatured = properties.filter((property) => property.featured);
  const featured = (selectedFeatured.length > 0 ? selectedFeatured : properties).slice(0, 3);
  const recent = [...properties]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);
  const heroImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=3200&q=95';
  const activeCategories = categoryDetails.flatMap(({ name, label }) => {
    const categoryProperties = properties.filter((property) => property.category === name && property.images[0]);
    const availableCount = categoryProperties.filter((property) => property.status === 'Available').length;
    const property = categoryProperties.find((item) => item.status === 'Available') ?? categoryProperties[0];
    return property ? [{ name, label, availableCount, image: property.images[0].imageUrl }] : [];
  });

  return (
    <main className="min-h-screen bg-[#f8f9f7] text-[#202522]">
      <Header />

      <section className="relative isolate min-h-[560px] overflow-hidden bg-[#dce2dd] text-white sm:min-h-[620px] lg:min-h-[700px]">
        <Image
          src={heroImage}
          alt="Contemporary home surrounded by landscaped greenery"
          fill
          preload
          quality={90}
          sizes="100vw"
          className="hero-media object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,26,23,.72)_0%,rgba(20,26,23,.34)_55%,rgba(20,26,23,.12)_100%)]" />
        <div className="relative mx-auto flex min-h-[560px] max-w-[1440px] items-center px-5 py-10 sm:min-h-[620px] sm:px-8 sm:py-14 lg:min-h-[700px] lg:px-12">
          <div className="hero-intro w-full max-w-4xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/75">Property across Pampanga</p>
            <h1 className="display max-w-3xl text-4xl leading-[0.98] tracking-[-0.045em] sm:text-7xl sm:tracking-[-0.055em] lg:text-[82px]">Find your next property.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/88 sm:mt-5 sm:text-lg sm:leading-7">Search homes, land, commercial spaces, rentals, and investment opportunities in one trusted place.</p>

            <form action="/properties" className="mt-6 grid max-w-4xl gap-2 rounded-xl bg-white p-2 shadow-[0_14px_40px_rgba(16,24,20,0.22)] sm:mt-9 sm:grid-cols-[0.8fr_1fr_1.2fr_auto] sm:rounded-2xl">
              <label className="rounded-xl px-4 py-3 text-[#202522] hover:bg-[#f5f7f4]">
                <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#68716b]">I want to</span>
                <select name="listingType" className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"><option value="For Sale">Buy</option><option value="For Rent">Rent</option></select>
              </label>
              <label className="rounded-xl border-t border-[#edf0ec] px-4 py-3 text-[#202522] hover:bg-[#f5f7f4] sm:border-l sm:border-t-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#68716b]">Property type</span>
                <select name="category" className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"><option value="All">All properties</option>{propertyCategories.map((category) => <option key={category}>{category}</option>)}</select>
              </label>
              <label className="rounded-xl border-t border-[#edf0ec] px-4 py-3 text-[#202522] hover:bg-[#f5f7f4] sm:border-l sm:border-t-0">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#68716b]"><MapPin className="h-3 w-3" /> Location</span>
                <input name="location" className="mt-1 w-full bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-[#8a918d]" placeholder="City or area" />
              </label>
              <button className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#24634e] px-7 py-4 text-sm font-bold text-white transition hover:bg-[#1b4f3e]"><Search className="h-4 w-4" /> Search</button>
            </form>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div data-reveal className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">Browse by property type</p><h2 className="display mt-3 text-3xl tracking-[-0.04em] sm:text-5xl">Start with what fits your plans.</h2></div>
          <Link href="/properties" className="flex items-center gap-2 text-sm font-semibold text-[#24634e] hover:text-[#173f32]">View all properties <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {activeCategories.map(({ name, label, image, availableCount }, index) => {
            return (
              <Link data-reveal key={name} href={`/properties?category=${encodeURIComponent(name)}`} className={`group relative isolate min-h-56 overflow-hidden rounded-xl bg-[#dfe3df] sm:min-h-64 ${index === 0 && activeCategories.length > 2 ? 'md:col-span-2 md:row-span-2 md:min-h-[544px]' : ''}`}>
                <Image src={image} alt={`${label} available through DGR Realty`} fill unoptimized sizes={index === 0 ? '(max-width: 768px) 50vw, 50vw' : '(max-width: 768px) 50vw, 25vw'} className="object-cover transition duration-500 group-hover:scale-[1.035]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <h3 className="text-lg font-bold tracking-[-0.02em]">{label}</h3>
                  <p className="mt-1 text-xs text-white/75">{availableCount} available {availableCount === 1 ? 'listing' : 'listings'}</p>
                </div>
              </Link>
            );
          })}
          <Link data-reveal href="/properties" className="group flex min-h-56 flex-col justify-between rounded-xl bg-[#dce9e3] p-6 text-[#173f32] transition hover:bg-[#cee1d8] sm:min-h-64">
            <ArrowRight className="h-6 w-6 self-end transition group-hover:translate-x-1" />
            <div><p className="text-xs font-bold uppercase tracking-[0.12em]">All categories</p><h3 className="mt-2 text-xl font-bold">Explore every opportunity</h3></div>
          </Link>
        </div>
      </section>

      <section id="properties" className="border-y border-[#e7e9e6] bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div data-reveal className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="eyebrow">Featured properties</p><h2 className="display mt-3 text-3xl tracking-[-0.04em] sm:text-5xl">Standout places, carefully selected.</h2></div>
            <Link href="/properties" className="flex items-center gap-2 text-sm font-semibold text-[#24634e]">Browse all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {featured.length > 0 ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{featured.map((property, index) => <PropertyCard key={property.id} property={property} priority={index < 2} />)}</div> : <div className="rounded-2xl border border-dashed border-[#d8ddd9] px-6 py-16 text-center text-sm text-[#6d756f]">Featured listings will appear here once they are added.</div>}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div data-reveal className="mb-10 flex items-end justify-between gap-6"><div><p className="eyebrow">Recently added</p><h2 className="display mt-3 text-3xl tracking-[-0.04em] sm:text-5xl">New to the market.</h2></div><Link href="/properties?sort=Newest" className="hidden items-center gap-2 text-sm font-semibold text-[#24634e] sm:flex">See newest <ArrowRight className="h-4 w-4" /></Link></div>
        {recent.length > 0 ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{recent.map((property) => <PropertyCard key={property.id} property={property} />)}</div> : <div className="rounded-2xl border border-dashed border-[#d8ddd9] px-6 py-16 text-center text-sm text-[#6d756f]">New listings will appear here as they are published.</div>}
      </section>

      <section id="about" className="overflow-hidden bg-[#f7f3eb] py-20 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-12">
          <div data-reveal="left" className="relative mx-auto w-full max-w-[600px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#d8ccbc] bg-[#e8dfd2] shadow-[0_26px_70px_rgba(66,49,35,0.16)]">
              <Image src={agentPhoto} alt="Glenndz Rivera, DGR Realty property broker" fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover object-[62%_64%]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#17271f]/20 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 shadow-[0_18px_45px_rgba(47,37,28,0.16)] backdrop-blur-xl sm:left-8 sm:px-6">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#eee2d2] text-[#754f35]"><Award className="h-5 w-5" /></span>
              <span><strong className="display block text-2xl leading-none text-[#1d2923]">19 years</strong><span className="mt-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#657069]">in real estate</span></span>
            </div>
          </div>
          <div data-reveal="right" className="pt-6 lg:pt-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f5b46]">Real Estate Broker</p>
            <h2 className="display mt-4 text-5xl leading-[1.02] tracking-[-0.05em] text-[#202823] sm:text-6xl lg:text-7xl">Glenndz Rivera</h2>
            <p className="mt-4 text-base font-bold text-[#424a45]">DGR Realty</p>
            <p className="mt-7 max-w-2xl text-base leading-8 text-[#5d655f]">With 19 years of experience, Glenndz brings seasoned local insight and steady guidance to every property decision. Let&apos;s sit down and make your next move clear, practical, and confident.</p>
            <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-6">
              {agentValueProps.map(({ label, Icon }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#b9c9c0] text-[#1f5b46]"><Icon className="h-[18px] w-[18px]" /></span>
                  <p className="pt-1 text-sm font-semibold leading-5 text-[#37413b]">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/#contact" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f5b46] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(31,91,70,0.18)] transition hover:bg-[#174735]">Let&apos;s Talk Properties <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/properties" className="inline-flex items-center justify-center rounded-xl border border-[#1f5b46] bg-transparent px-6 py-3.5 text-sm font-bold text-[#27332d] transition hover:bg-[#edf1eb]">View Listings</Link>
            </div>
            <div className="mt-7 flex flex-col gap-3 border-t border-[#ded5c9] pt-6 text-sm text-[#535d57] sm:flex-row sm:flex-wrap sm:gap-x-6">
              {contact.phone && contact.phoneHref && <a href={contact.phoneHref} className="flex items-center gap-2 transition hover:text-[#1f5b46]"><Phone className="h-4 w-4 text-[#1f5b46]" /> {contact.phone}</a>}
              {contact.email && contact.emailHref && <a href={contact.emailHref} className="flex items-center gap-2 break-all transition hover:text-[#1f5b46]"><Mail className="h-4 w-4 shrink-0 text-[#1f5b46]" /> {contact.email}</a>}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div data-reveal className="grid overflow-hidden rounded-2xl border border-[#e1e5e1] bg-white shadow-[0_12px_38px_rgba(29,39,33,0.06)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#24634e] p-7 text-white sm:p-10 lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">Contact DGR Realty</p>
            <h2 className="display mt-4 text-4xl leading-tight tracking-[-0.04em]">Let’s find the right next move.</h2>
            <p className="mt-5 text-sm leading-7 text-white/72">Buying, renting, selling, or listing? Share what you need and we’ll get back to you.</p>
            <div className="mt-10 space-y-5 text-sm">
              {contact.phone && contact.phoneHref && <a href={contact.phoneHref} className="flex items-center gap-3 transition hover:text-white/75"><Phone className="h-5 w-5 text-white/70" /> {contact.phone}</a>}
              {contact.email && contact.emailHref && <a href={contact.emailHref} className="flex items-center gap-3 transition hover:text-white/75"><Mail className="h-5 w-5 text-white/70" /> {contact.email}</a>}
              {contact.facebookUrl && <a href={contact.facebookUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 transition hover:text-white/75"><MessageCircle className="h-5 w-5 text-white/70" /> Facebook</a>}
              {contact.messengerUrl && <a href={contact.messengerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 transition hover:text-white/75"><MessageCircle className="h-5 w-5 text-white/70" /> Messenger</a>}
            </div>
            {!contact.phone && !contact.email && !contact.facebookUrl && !contact.messengerUrl && <p className="mt-10 text-xs leading-5 text-white/60">Use the secure inquiry form and our team will respond using the details you provide.</p>}
          </div>
          <InquiryForm source="homepage" variant="home" />
        </div>
      </section>

      <Footer />
    </main>
  );
}
