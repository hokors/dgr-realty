import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const navigation = [
  ['/', 'Home'],
  ['/properties', 'Properties'],
  ['/#about', 'About'],
  ['/#contact', 'Contact'],
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-white/95 text-brand-text backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="DGR Realty home">
          <Image src="/brand/dgr-mark.png" alt="" width={44} height={44} priority className="h-10 w-10 object-contain" />
          <span className="text-[19px] font-bold tracking-[-0.045em]"><span className="text-brand-accent-strong">DGR</span> Realty</span>
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] font-medium md:flex" aria-label="Primary navigation">
          {navigation.map(([href, label]) => (
            <Link key={`${href}-${label}`} className="transition-colors hover:text-brand-secondary-strong" href={href}>{label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/#contact" className="hidden rounded-full bg-brand-accent-strong px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-primary sm:inline-flex">
            List a property
          </Link>
          <details className="mobile-menu relative md:hidden">
            <summary className="grid h-10 w-10 place-items-center rounded-full border border-brand-border bg-white text-brand-text">
              <Menu className="menu-open h-4 w-4" aria-hidden="true" />
              <X className="menu-close hidden h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Open navigation</span>
            </summary>
            <nav className="absolute right-0 top-12 w-64 rounded-2xl border border-brand-border bg-white p-2 text-brand-text shadow-[0_18px_50px_rgba(6,40,61,0.14)]" aria-label="Mobile navigation">
              {navigation.map(([href, label]) => (
                <Link key={`${href}-${label}`} href={href} className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-brand-secondary-soft hover:text-brand-secondary-strong">
                  {label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
