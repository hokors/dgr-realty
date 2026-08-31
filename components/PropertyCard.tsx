import Image from 'next/image';
import Link from 'next/link';
import { Bath, BedDouble, CarFront, MapPin, MoveDiagonal } from 'lucide-react';
import { formatArea, formatPrice } from '@/lib/format';
import type { Property } from '@/lib/types';

type PropertyCardProps = {
  property: Property;
  priority?: boolean;
};

export function PropertyCard({ property, priority = false }: PropertyCardProps) {
  const mainImage = property.images[0];
  const specs = [
    property.bedrooms ? { icon: BedDouble, label: `${property.bedrooms} beds` } : null,
    property.bathrooms ? { icon: Bath, label: `${property.bathrooms} baths` } : null,
    property.parkingSpaces ? { icon: CarFront, label: `${property.parkingSpaces} parking` } : null,
    property.lotArea ? { icon: MoveDiagonal, label: formatArea(property.lotArea) } : null,
  ].filter(Boolean).slice(0, 3) as Array<{ icon: typeof BedDouble; label: string }>;

  return (
    <article className="group overflow-hidden rounded-[22px] border border-[#dfe2dc] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(23,54,44,0.10)]">
      <Link href={`/properties/${property.slug}`} className="block" aria-label={`View ${property.title}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[#dfe3dc]">
          {mainImage ? (
            <Image
              src={mainImage.imageUrl}
              alt={mainImage.altText ?? property.title}
              fill
              priority={priority}
              unoptimized
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition duration-700 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-[#6e7771]">Photo coming soon</div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <span className="rounded-full bg-[#f7f6f1]/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#17362c] backdrop-blur">
              {property.listingType}
            </span>
            {property.status !== 'Available' && (
              <span className="rounded-full bg-[#17362c]/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur">
                {property.status}
              </span>
            )}
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#978147]">{property.category}</span>
            <span className="flex items-center gap-1 text-xs text-[#6e7771]"><MapPin className="h-3.5 w-3.5" /> {property.city}</span>
          </div>
          <h3 className="min-h-14 text-xl font-semibold leading-7 tracking-[-0.03em] text-[#17362c]">{property.title}</h3>
          <p className="mt-4 text-lg font-semibold text-[#17362c]">{formatPrice(property.price, property.priceSuffix)}</p>
          {specs.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#e6e7e2] pt-4 text-xs text-[#657069]">
              {specs.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
