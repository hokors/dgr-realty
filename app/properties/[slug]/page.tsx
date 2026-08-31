import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  Images,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  MoveDiagonal,
  Phone,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatArea, formatDate, formatPrice } from '@/lib/format';
import { getPropertyBySlug } from '@/lib/properties';

type PropertyPageProps = { params: Promise<{ slug: string }> };

// Avoid querying Supabase while Vercel is collecting build-time page data.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return { title: 'Property not found' };

  const description = `${property.listingType}: ${property.title} in ${property.location}. ${formatPrice(property.price, property.priceSuffix)}.`;
  const image = property.images[0]?.imageUrl;

  return {
    title: property.title,
    description,
    openGraph: { title: `${property.title} | DGR Realty`, description, type: 'article', images: image ? [{ url: image, alt: property.images[0]?.altText ?? property.title }] : [] },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: `${property.title} | DGR Realty`, description, images: image ? [image] : [] },
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

  const specs = [
    property.bedrooms ? { icon: BedDouble, value: property.bedrooms, label: 'Bedrooms' } : null,
    property.bathrooms ? { icon: Bath, value: property.bathrooms, label: 'Bathrooms' } : null,
    property.parkingSpaces ? { icon: CarFront, value: property.parkingSpaces, label: 'Parking' } : null,
    property.floorArea ? { icon: Maximize2, value: formatArea(property.floorArea), label: 'Floor area' } : null,
    property.lotArea ? { icon: MoveDiagonal, value: formatArea(property.lotArea), label: 'Lot area' } : null,
    { icon: Building2, value: property.category, label: 'Property type' },
  ].filter(Boolean) as Array<{ icon: typeof BedDouble; value: string | number; label: string }>;

  const propertyDetails = [
    ['Listing type', property.listingType],
    ['Property status', property.status],
    ['Property category', property.category],
    property.floorArea ? ['Floor area', formatArea(property.floorArea)] : null,
    property.lotArea ? ['Lot area', formatArea(property.lotArea)] : null,
    property.parkingSpaces ? ['Parking spaces', String(property.parkingSpaces)] : null,
    ['Date listed', formatDate(property.createdAt)],
  ].filter(Boolean) as string[][];

  return (
    <main className="min-h-screen bg-[#f8f9f7] text-[#202522]">
      <Header />
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-5 sm:px-8 lg:px-12 lg:pb-24">
        <div className="flex flex-wrap items-center gap-2 py-3 text-xs text-[#707873]">
          <Link href="/properties" className="flex items-center gap-1 hover:text-[#24634e]"><ArrowLeft className="h-3.5 w-3.5" /> Properties</Link><ChevronRight className="h-3 w-3" /><span>{property.category}</span><ChevronRight className="h-3 w-3" /><span className="max-w-48 truncate text-[#333936]">{property.title}</span>
        </div>

        <section className="mb-7 flex flex-col gap-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[#e6f0eb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#24634e]">{property.listingType}</span>
              {property.status !== 'Available' && <span className="rounded-lg bg-[#eef0ed] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#5d655f]">{property.status}</span>}
            </div>
            <h1 className="display max-w-4xl text-4xl leading-[1.05] tracking-[-0.045em] sm:text-5xl">{property.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-[#68716b]"><MapPin className="h-4 w-4 text-[#24634e]" /> {property.location}, {property.province}</p>
          </div>
          <div className="lg:text-right"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7b837e]">{property.listingType}</p><p className="mt-1 text-3xl font-bold tracking-[-0.045em]">{formatPrice(property.price, property.priceSuffix)}</p></div>
        </section>

        <section className="relative grid gap-2 overflow-hidden rounded-2xl bg-[#e4e8e4] lg:h-[600px] lg:grid-cols-[1.45fr_1fr]">
          <div className="relative aspect-[4/3] min-h-80 overflow-hidden lg:aspect-auto">
            {property.images[0] ? <Image src={property.images[0].imageUrl} alt={property.images[0].altText ?? property.title} fill priority unoptimized sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" /> : <div className="grid h-full place-items-center text-sm text-[#717a74]">Photo coming soon</div>}
          </div>
          <div className="hidden grid-cols-2 grid-rows-2 gap-2 lg:grid">
            {[1, 2, 3, 4].map((imageIndex) => {
              const image = property.images[imageIndex];
              return <div key={image?.id ?? imageIndex} className="relative overflow-hidden bg-[#dfe3df]">{image ? <Image src={image.imageUrl} alt={image.altText ?? `${property.title} view ${imageIndex + 1}`} fill unoptimized sizes="20vw" className="object-cover" /> : <div className="grid h-full place-items-center text-xs text-[#77807a]">More photos soon</div>}</div>;
            })}
          </div>
          {property.images.length > 1 && <a href="#all-images" className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-[#202522] shadow-md"><Images className="h-4 w-4" /> View all {property.images.length} images</a>}
        </section>

        {property.images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:hidden">{property.images.slice(1).map((image) => <div key={image.id} className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-[#dfe3df]"><Image src={image.imageUrl} alt={image.altText ?? property.title} fill unoptimized sizes="144px" className="object-cover" /></div>)}</div>}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start">
          <div>
            {specs.length > 0 && (
              <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#e1e5e1] bg-white sm:grid-cols-3">
                {specs.map(({ icon: Icon, value, label }) => <div key={label} className="border-b border-r border-[#edf0ed] p-5"><Icon className="h-5 w-5 text-[#24634e]" strokeWidth={1.7} /><p className="mt-3 text-base font-bold">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#7b837e]">{label}</p></div>)}
              </section>
            )}

            <section className="mt-10 rounded-2xl border border-[#e1e5e1] bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold tracking-[-0.025em]">Description</h2>
              <p className="mt-5 max-w-3xl text-[15px] leading-8 text-[#59615c]">{property.description}</p>
            </section>

            {property.amenities.length > 0 && (
              <section className="mt-6 rounded-2xl border border-[#e1e5e1] bg-white p-6 sm:p-8">
                <h2 className="text-xl font-bold tracking-[-0.025em]">Features &amp; amenities</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">{property.amenities.map((amenity) => <span key={amenity} className="flex items-center gap-3 text-sm text-[#4f5752]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#e6f0eb]"><Check className="h-3.5 w-3.5 text-[#24634e]" /></span>{amenity}</span>)}</div>
              </section>
            )}

            <section className="mt-6 rounded-2xl border border-[#e1e5e1] bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold tracking-[-0.025em]">Property details</h2>
              <dl className="mt-5 divide-y divide-[#edf0ed]">{propertyDetails.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-5 py-3.5 text-sm"><dt className="text-[#737b76]">{label}</dt><dd className="text-right font-semibold text-[#2b312d]">{value}</dd></div>)}</dl>
            </section>

            <section className="mt-6 rounded-2xl border border-[#e1e5e1] bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold tracking-[-0.025em]">Location</h2>
              <p className="mt-3 flex items-start gap-2 text-sm text-[#59615c]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#24634e]" /> {property.location}, {property.city}, {property.province}</p>
              <div className="mt-5 grid min-h-48 place-items-center rounded-xl bg-[#eef2ef] px-6 text-center"><div><MapPin className="mx-auto h-6 w-6 text-[#24634e]" /><p className="mt-2 text-sm font-semibold">Map integration ready</p><p className="mt-1 text-xs text-[#747c77]">Connect a preferred map provider when location coordinates are available.</p></div></div>
            </section>

            {property.images.length > 1 && (
              <section id="all-images" className="mt-6 scroll-mt-24 rounded-2xl border border-[#e1e5e1] bg-white p-6 sm:p-8">
                <h2 className="text-xl font-bold tracking-[-0.025em]">All property images</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {property.images.map((image, index) => <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#e4e8e4]"><Image src={image.imageUrl} alt={image.altText ?? `${property.title} image ${index + 1}`} fill unoptimized sizes="(max-width: 640px) 100vw, 40vw" className="object-cover" /></div>)}
                </div>
              </section>
            )}
          </div>

          <aside id="inquiry" className="rounded-2xl border border-[#dde2de] bg-white p-6 shadow-[0_16px_44px_rgba(29,39,33,0.09)] lg:sticky lg:top-24 sm:p-7">
            <h2 className="text-xl font-bold tracking-[-0.025em]">Interested in this property?</h2>
            <p className="mt-3 text-sm leading-6 text-[#68716b]">Ask about availability, request details, or schedule a viewing with DGR Realty.</p>
            <form className="mt-6 space-y-3">
              <label className="block"><span className="sr-only">Full name</span><input required name="name" placeholder="Full name" className="form-field" /></label>
              <label className="block"><span className="sr-only">Phone or email</span><input required name="contact" placeholder="Phone or email" className="form-field" /></label>
              <label className="block"><span className="sr-only">Message</span><textarea name="message" rows={3} defaultValue={`I'm interested in ${property.title}.`} className="form-field resize-none" /></label>
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#24634e] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#1b4f3e]"><Mail className="h-4 w-4" /> Send inquiry</button>
            </form>
            <div className="my-5 h-px bg-[#edf0ed]" />
            <div className="grid gap-2.5">
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce1dd] px-5 py-3 text-sm font-semibold hover:bg-[#f4f6f4]"><Phone className="h-4 w-4" /> Call / contact agent</button>
              <a href="#" className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce1dd] px-5 py-3 text-sm font-semibold hover:bg-[#f4f6f4]"><MessageCircle className="h-4 w-4" /> Message on Facebook</a>
              <a href="#" className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce1dd] px-5 py-3 text-sm font-semibold hover:bg-[#f4f6f4]"><MessageCircle className="h-4 w-4" /> Messenger</a>
            </div>
            <p className="mt-5 text-center text-[11px] leading-5 text-[#8a918d]">Contact details and social links are configurable placeholders.</p>
          </aside>
        </div>
      </div>
      <Footer />
    </main>
  );
}
