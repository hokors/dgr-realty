import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  MoveDiagonal,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatArea, formatDate, formatPrice } from '@/lib/format';
import { getProperties, getPropertyBySlug } from '@/lib/properties';

type PropertyPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const properties = await getProperties();
  return properties.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return { title: 'Property not found' };

  const description = `${property.listingType}: ${property.title} in ${property.location}. ${formatPrice(property.price, property.priceSuffix)}.`;
  const image = property.images[0]?.imageUrl;

  return {
    title: property.title,
    description,
    openGraph: {
      title: `${property.title} | DGR Realty`,
      description,
      type: 'article',
      images: image ? [{ url: image, alt: property.images[0]?.altText ?? property.title }] : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${property.title} | DGR Realty`,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

  const specs = [
    property.bedrooms ? { icon: BedDouble, value: property.bedrooms, label: 'Bedrooms' } : null,
    property.bathrooms ? { icon: Bath, value: property.bathrooms, label: 'Bathrooms' } : null,
    property.parkingSpaces ? { icon: CarFront, value: property.parkingSpaces, label: 'Parking spaces' } : null,
    property.lotArea ? { icon: MoveDiagonal, value: formatArea(property.lotArea), label: 'Lot area' } : null,
    property.floorArea ? { icon: Maximize2, value: formatArea(property.floorArea), label: 'Floor area' } : null,
  ].filter(Boolean) as Array<{ icon: typeof BedDouble; value: string | number; label: string }>;

  return (
    <main className="min-h-screen bg-[#f7f6f1] text-[#17362c]">
      <Header />
      <div className="mx-auto max-w-[1440px] px-6 pb-24 pt-8 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center gap-2 py-4 text-xs text-[#6c766f]">
          <Link href="/properties" className="flex items-center gap-1 hover:text-[#17362c]"><ArrowLeft className="h-3.5 w-3.5" /> Properties</Link>
          <ChevronRight className="h-3 w-3" />
          <span>{property.category}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="max-w-48 truncate text-[#17362c]">{property.title}</span>
        </div>

        <section className="grid gap-2 overflow-hidden rounded-[26px] lg:grid-cols-[1.5fr_0.75fr]">
          <div className="relative aspect-[4/3] min-h-80 overflow-hidden bg-[#dfe2dc] lg:aspect-auto lg:min-h-[620px]">
            {property.images[0] && <Image src={property.images[0].imageUrl} alt={property.images[0].altText ?? property.title} fill priority unoptimized sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover" />}
          </div>
          <div className="hidden gap-2 lg:grid">
            {[property.images[1], property.images[2]].map((image, index) => (
              <div key={image?.id ?? index} className="relative overflow-hidden bg-[#dfe2dc]">
                {image ? <Image src={image.imageUrl} alt={image.altText ?? `${property.title} view ${index + 2}`} fill unoptimized sizes="34vw" className="object-cover" /> : <div className="grid h-full place-items-center text-sm text-[#68736d]">More photos soon</div>}
              </div>
            ))}
          </div>
        </section>

        {property.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {property.images.slice(1).map((image) => (
              <div key={image.id} className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-[#dfe2dc]">
                <Image src={image.imageUrl} alt={image.altText ?? property.title} fill unoptimized sizes="128px" className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#17362c] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">{property.listingType}</span>
              <span className="rounded-full border border-[#ccd2ca] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em]">{property.category}</span>
              <span className="rounded-full bg-[#e5ddc9] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6d5b2f]">{property.status}</span>
            </div>
            <h1 className="display mt-6 max-w-4xl text-4xl leading-[1.02] tracking-[-0.04em] sm:text-6xl">{property.title}</h1>
            <p className="mt-5 flex items-center gap-2 text-sm text-[#66716a]"><MapPin className="h-4 w-4 text-[#9b844a]" /> {property.location}, {property.province}</p>
            <p className="mt-6 text-3xl font-semibold tracking-[-0.03em]">{formatPrice(property.price, property.priceSuffix)}</p>

            {specs.length > 0 && (
              <div className="mt-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#dfe2dc] bg-white sm:grid-cols-3">
                {specs.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="border-b border-r border-[#e3e5e0] p-5 last:border-r-0">
                    <Icon className="h-5 w-5 text-[#9b844a]" strokeWidth={1.7} />
                    <p className="mt-4 text-lg font-semibold">{value}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#778079]">{label}</p>
                  </div>
                ))}
              </div>
            )}

            <section className="mt-12 border-t border-[#dfe2dc] pt-10">
              <p className="eyebrow">About this property</p>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#5f6a64]">{property.description}</p>
            </section>

            {property.amenities.length > 0 && (
              <section className="mt-12 border-t border-[#dfe2dc] pt-10">
                <p className="eyebrow">Features &amp; amenities</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {property.amenities.map((amenity) => <span key={amenity} className="flex items-center gap-3 text-sm text-[#4f5d55]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#dfe7df]"><Check className="h-3.5 w-3.5" /></span>{amenity}</span>)}
                </div>
              </section>
            )}

            <div className="mt-12 flex items-center gap-2 border-t border-[#dfe2dc] pt-7 text-xs text-[#758078]">
              <CalendarDays className="h-4 w-4" /> Listed {formatDate(property.createdAt)}
            </div>
          </div>

          <aside id="inquiry" className="rounded-[24px] border border-[#d8dcd5] bg-white p-6 shadow-[0_18px_50px_rgba(23,54,44,0.08)] lg:sticky lg:top-6 sm:p-7">
            <p className="eyebrow">Interested?</p>
            <h2 className="display mt-3 text-3xl">Ask about this property.</h2>
            <p className="mt-3 text-sm leading-6 text-[#66716a]">Send DGR Realty a message to confirm availability, request more details, or schedule a viewing.</p>
            <form className="mt-6 space-y-3">
              <label className="block"><span className="sr-only">Full name</span><input required name="name" placeholder="Full name" className="form-field" /></label>
              <label className="block"><span className="sr-only">Phone or email</span><input required name="contact" placeholder="Phone or email" className="form-field" /></label>
              <label className="block"><span className="sr-only">Message</span><textarea name="message" rows={4} defaultValue={`I’m interested in ${property.title}.`} className="form-field resize-none" /></label>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-[#17362c] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#23483b]"><Mail className="h-4 w-4" /> Send inquiry</button>
            </form>
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-[#9aa19c]"><span className="h-px flex-1 bg-[#e4e6e1]" /> or <span className="h-px flex-1 bg-[#e4e6e1]" /></div>
            <a href="#" className="flex w-full items-center justify-center gap-2 rounded-full border border-[#cfd4cd] px-5 py-3.5 text-sm font-semibold transition hover:bg-[#eef0eb]"><MessageCircle className="h-4 w-4" /> Facebook / Messenger</a>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#8a928d]"><MessageCircle className="h-3.5 w-3.5" /> Usually replies within the day</p>
          </aside>
        </div>
      </div>
      <Footer />
    </main>
  );
}
