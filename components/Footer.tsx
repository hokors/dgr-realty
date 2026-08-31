import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#10271f] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-12 lg:py-20">
        <div>
          <Link href="/" className="text-2xl font-semibold tracking-[-0.045em]">DGR Realty</Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
            A clearer, more personal way to discover property opportunities across Pampanga and nearby areas.
          </p>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#d5b86f]">Explore</p>
          <div className="grid gap-3 text-sm text-white/70">
            <Link href="/properties" className="hover:text-white">Browse properties</Link>
            <Link href="/properties?listingType=For+Sale" className="hover:text-white">Properties for sale</Link>
            <Link href="/properties?listingType=For+Rent" className="hover:text-white">Properties for rent</Link>
            <Link href="/admin" className="hover:text-white">Admin access</Link>
          </div>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#d5b86f]">Connect</p>
          <div className="grid gap-3 text-sm text-white/70">
            <a href="#" className="flex items-center gap-1 hover:text-white">Facebook <ArrowUpRight className="h-3.5 w-3.5" /></a>
            <a href="#" className="flex items-center gap-1 hover:text-white">Messenger <ArrowUpRight className="h-3.5 w-3.5" /></a>
            <span>+63 9XX XXX XXXX</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-6 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>© {new Date().getFullYear()} DGR Realty. All rights reserved.</span>
          <span>Equal Housing Opportunity</span>
        </div>
      </div>
    </footer>
  );
}
