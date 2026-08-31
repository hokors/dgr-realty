import Link from 'next/link';
import { Mail, MessageCircle, Phone } from 'lucide-react';

const categories = ['House', 'Condominium', 'Lot', 'Raw Land', 'Rentals', 'Commercial', 'Farm Lot'];

export function Footer() {
  return (
    <footer className="bg-[#202522] text-white">
      <div data-reveal className="mx-auto grid max-w-[1440px] gap-12 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1.1fr] lg:px-12 lg:py-20">
        <div>
          <Link href="/" className="text-xl font-bold tracking-[-0.04em]">DGR Realty</Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/58">A clear, modern way to browse homes, land, rentals, and investment opportunities across Pampanga.</p>
          <Link href="/properties" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#202522] transition hover:bg-[#eef1ee]">Browse properties</Link>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-white/45">Explore</p>
          <div className="grid gap-3 text-sm text-white/68"><Link href="/">Home</Link><Link href="/properties">All properties</Link><Link href="/properties?listingType=For+Sale">For sale</Link><Link href="/properties?listingType=For+Rent">For rent</Link><Link href="/#contact">Contact</Link><Link href="/admin">Admin access</Link></div>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-white/45">Property types</p>
          <div className="grid gap-3 text-sm text-white/68">{categories.map((category) => <Link key={category} href={`/properties?category=${encodeURIComponent(category)}`}>{category}</Link>)}</div>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-white/45">Contact</p>
          <div className="grid gap-4 text-sm text-white/68">
            <span className="flex items-center gap-2.5"><Phone className="h-4 w-4" /> +63 9XX XXX XXXX</span>
            <span className="flex items-center gap-2.5"><Mail className="h-4 w-4" /> inquiries@dgrrealty.example</span>
            <a href="#" className="flex items-center gap-2.5"><MessageCircle className="h-4 w-4" /> Facebook</a>
            <a href="#" className="flex items-center gap-2.5"><MessageCircle className="h-4 w-4" /> Messenger</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-6 text-xs text-white/38 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>Copyright {new Date().getFullYear()} DGR Realty. All rights reserved.</span>
          <span>Equal Housing Opportunity</span>
        </div>
      </div>
    </footer>
  );
}
