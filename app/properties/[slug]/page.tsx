import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CarFront,
  Check,
  ChevronRight,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  MoveDiagonal,
  Phone,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PropertyGallery } from '@/components/PropertyGallery';
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
    property.bedrooms != null ? { icon: BedDouble, value: property.bedrooms, label: 'Bedrooms' } : null,
    property.bathrooms != null ? { icon: Bath, value: property.bathrooms, label: 'Bathrooms' } : null,
    property.parkingSpaces != null ? { icon: CarFront, value: property.parkingSpaces, label: 'Parking' } : null,
    property.floorArea != null ? { icon: Maximize2, value: formatArea(property.floorArea), label: 'Floor area' } : null,
    property.lotArea != null ? { icon: MoveDiagonal, value: formatArea(property.lotArea), label: 'Lot area' } : null,
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

  const statusTone = property.status === 'Available'
    ? 'bg-[#e5f1e9] text-[#28744e]'
    : property.status === 'Reserved' || property.status === 'Under Negotiation'
      ? 'bg-[#f5eddb] text-[#806321]'
      : 'bg-[#eceeed] text-[#5b635e]';

  return (
    <main className="min-h-screen bg-[#f8f9f7] pb-20 text-[#202522] lg:pb-0">
      <Header />
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-5 sm:px-8 lg:px-12 lg:pb-24">
        <div className="flex flex-wrap items-center gap-2 py-3 text-xs text-[#707873]">
          <Link href="/properties" className="flex items-center gap-1 hover:text-[#24634e]"><ArrowLeft className="h-3.5 w-3.5" /> Properties</Link><ChevronRight className="h-3 w-3" /><span>{property.category}</span><ChevronRight className="h-3 w-3" /><span className="max-w-48 truncate text-[#333936]">{property.title}</span>
        </div>

        <section data-reveal className="mb-7 flex flex-col gap-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[#e6f0eb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#24634e]">{property.listingType}</span>
              <span className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${statusTone}`}>{property.status}</span>
            </div>
            <h1 className="display max-w-4xl text-4xl leading-[1.05] tracking-[-0.045em] sm:text-5xl">{property.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-[#68716b]"><MapPin className="h-4 w-4 text-[#24634e]" /> {property.location}, {property.city}, {property.province}</p>
          </div>
          <div className="rounded-2xl border border-[#dfe4e0] bg-white px-5 py-4 lg:min-w-72 lg:text-right"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7b837e]">{property.listingType}</p><p className="mt-1 text-3xl font-bold tracking-[-0.045em]">{formatPrice(property.price, property.priceSuffix)}</p><a href="#inquiry" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#24634e]">Inquire about this property <ChevronRight className="h-3.5 w-3.5" /></a></div>
        </section>

        <PropertyGallery images={property.images} title={property.title} />

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start">
          <div>
            {specs.length > 0 && (
              <section data-reveal className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#e1e5e1] bg-white sm:grid-cols-3">
                {specs.map(({ icon: Icon, value, label }) => <div key={label} className="border-b border-r border-[#edf0ed] p-5"><Icon className="h-5 w-5 text-[#24634e]" strokeWidth={1.7} /><p className="mt-3 text-base font-bold">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#7b837e]">{label}</p></div>)}
              </section>
            )}

            <section data-reveal className="mt-10 rounded-2xl border border-[#e1e5e1] bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold tracking-[-0.025em]">Description</h2>
              <p className="mt-5 max-w-3xl whitespace-pre-line text-[15px] leading-8 text-[#59615c]">{property.description || 'Contact DGR Realty for the full description and additional information about this property.'}</p>
            </section>

            {property.amenities.length > 0 && (
              <section data-reveal className="mt-6 rounded-2xl border border-[#e1e5e1] bg-white p-6 sm:p-8">
                <h2 className="text-xl font-bold tracking-[-0.025em]">Features &amp; amenities</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">{property.amenities.map((amenity) => <span key={amenity} className="flex items-center gap-3 text-sm text-[#4f5752]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#e6f0eb]"><Check className="h-3.5 w-3.5 text-[#24634e]" /></span>{amenity}</span>)}</div>
              </section>
            )}

            <section data-reveal className="mt-6 rounded-2xl border border-[#e1e5e1] bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold tracking-[-0.025em]">Property details</h2>
              <dl className="mt-5 divide-y divide-[#edf0ed]">{propertyDetails.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-5 py-3.5 text-sm"><dt className="text-[#737b76]">{label}</dt><dd className="text-right font-semibold text-[#2b312d]">{value}</dd></div>)}</dl>
            </section>

            <section data-reveal className="mt-6 rounded-2xl border border-[#e1e5e1] bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold tracking-[-0.025em]">Location</h2>
              <p className="mt-3 flex items-start gap-2 text-sm text-[#59615c]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#24634e]" /> {property.location}, {property.city}, {property.province}</p>
              <div className="mt-5 grid min-h-48 place-items-center rounded-xl bg-[#eef2ef] px-6 text-center"><div><MapPin className="mx-auto h-6 w-6 text-[#24634e]" /><p className="mt-2 text-sm font-semibold">Map integration ready</p><p className="mt-1 text-xs text-[#747c77]">Connect a preferred map provider when location coordinates are available.</p></div></div>
            </section>

          </div>

          <aside data-reveal="right" id="inquiry" className="rounded-2xl border border-[#dde2de] bg-white p-6 shadow-[0_16px_44px_rgba(29,39,33,0.09)] lg:sticky lg:top-24 sm:p-7">
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
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dce2dd] bg-white/96 px-4 py-3 shadow-[0_-10px_35px_rgba(24,35,29,0.10)] backdrop-blur lg:hidden"><div className="mx-auto flex max-w-xl items-center justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#7b837e]">{property.listingType}</p><p className="truncate text-lg font-bold tracking-[-0.03em]">{formatPrice(property.price, property.priceSuffix)}</p></div><a href="#inquiry" className="shrink-0 rounded-xl bg-[#24634e] px-5 py-3 text-sm font-bold text-white">Inquire now</a></div></div>
      <Footer />
    </main>
  );
}
