import Image from 'next/image';
import Link from 'next/link';
import { Bath, BedDouble, MapPin, Maximize2, MoveDiagonal } from 'lucide-react';
import { formatArea, formatPrice } from '@/lib/format';
import { formatPublicPropertyLocation } from '@/lib/property-quality';
import type { Property } from '@/lib/types';

type PropertyCardProps = {
  property: Property;
  priority?: boolean;
};

export function PropertyCard({ property, priority = false }: PropertyCardProps) {
  const mainImage = property.images[0];
  const publicLocation = formatPublicPropertyLocation(property.location, property.city, property.province);
  const area = property.floorArea
    ? { icon: Maximize2, label: `${formatArea(property.floorArea)} floor` }
    : property.lotArea
      ? { icon: MoveDiagonal, label: `${formatArea(property.lotArea)} lot` }
      : null;
  const specs = [
    property.bedrooms ? { icon: BedDouble, label: `${property.bedrooms} beds` } : null,
    property.bathrooms ? { icon: Bath, label: `${property.bathrooms} baths` } : null,
    area,
  ].filter(Boolean) as Array<{ icon: typeof BedDouble; label: string }>;

  return (
    <article data-reveal className="group overflow-hidden rounded-xl border border-[var(--brand-border)] bg-white transition duration-300 hover:-translate-y-0.5 hover:border-[var(--brand-border-strong)] hover:shadow-[0_10px_28px_rgba(3,27,43,0.10)]">
      <Link href={`/properties/${property.slug}`} className="block h-full" aria-label={`View ${property.title}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--brand-border)]">
          {mainImage ? (
            <Image src={mainImage.imageUrl} alt={mainImage.altText ?? property.title} fill priority={priority} unoptimized sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.025]" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-[var(--brand-muted)]">Photo coming soon</div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <span className="rounded-lg bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--brand-secondary-strong)] shadow-sm backdrop-blur">{property.listingType}</span>
            {property.status !== 'Available' && <span className="rounded-lg bg-[var(--brand-text)]/88 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur">{property.status}</span>}
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xl font-bold tracking-[-0.035em] text-[var(--brand-text)]">{formatPrice(property.price, property.priceSuffix)}</p>
            <span className="shrink-0 rounded-full bg-[var(--brand-secondary-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-secondary-strong)]">{property.category}</span>
          </div>
          <h3 className="mt-3 line-clamp-2 min-h-12 text-[17px] font-semibold leading-6 tracking-[-0.02em] text-[var(--brand-text)]">{property.title}</h3>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-[var(--brand-muted)]"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-secondary-strong)]" /> {publicLocation}</p>
          {specs.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--brand-border)] pt-4 text-[11px] text-[var(--brand-muted)]">
              {specs.map(({ icon: Icon, label }) => <span key={label} className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-[var(--brand-muted)]" /> {label}</span>)}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
