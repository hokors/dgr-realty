import Link from 'next/link';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { getPublicContactDetails } from '@/lib/contact';

const categories = ['House', 'Condominium', 'Lot', 'Raw Land', 'Rentals', 'Commercial', 'Farm Lot'];

export function Footer() {
  const contact = getPublicContactDetails();

  return (
    <footer className="bg-[#202522] text-white">
      <div data-reveal className="mx-auto grid max-w-[1440px] gap-12 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1.1fr] lg:px-12 lg:py-20">
        <div>
          <Link href="/" className="text-xl font-bold tracking-[-0.04em]">DGR Realty</Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/72">A clear, modern way to browse homes, land, rentals, and investment opportunities across Pampanga.</p>
          <Link href="/properties" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#202522] transition hover:bg-[#eef1ee]">Browse properties</Link>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-white/65">Explore</p>
          <div className="grid gap-3 text-sm text-white/76"><Link href="/">Home</Link><Link href="/properties">All properties</Link><Link href="/properties?listingType=For+Sale">For sale</Link><Link href="/properties?listingType=For+Rent">For rent</Link><Link href="/#contact">Contact</Link><Link href="/admin">Admin access</Link></div>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-white/65">Property types</p>
          <div className="grid gap-3 text-sm text-white/76">{categories.map((category) => <Link key={category} href={`/properties?category=${encodeURIComponent(category)}`}>{category}</Link>)}</div>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-white/65">Contact</p>
          <div className="grid gap-4 text-sm text-white/76">
            {contact.phone && contact.phoneHref && <a href={contact.phoneHref} className="flex items-center gap-2.5 transition hover:text-white"><Phone className="h-4 w-4" /> {contact.phone}</a>}
            {contact.email && contact.emailHref && <a href={contact.emailHref} className="flex items-center gap-2.5 transition hover:text-white"><Mail className="h-4 w-4" /> {contact.email}</a>}
            {contact.facebookUrl && <a href={contact.facebookUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 transition hover:text-white"><MessageCircle className="h-4 w-4" /> Facebook</a>}
            {contact.messengerUrl && <a href={contact.messengerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 transition hover:text-white"><MessageCircle className="h-4 w-4" /> Messenger</a>}
            {!contact.phone && !contact.email && !contact.facebookUrl && !contact.messengerUrl && <Link href="/#contact" className="font-semibold text-white/80 transition hover:text-white">Send an inquiry</Link>}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-6 text-xs text-white/62 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>Copyright {new Date().getFullYear()} DGR Realty. All rights reserved.</span>
          <span className="flex items-center gap-4"><Link href="/privacy" className="transition hover:text-white/70">Privacy</Link><span>Equal Housing Opportunity</span></span>
        </div>
      </div>
    </footer>
  );
}
