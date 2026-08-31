import Link from 'next/link';
import { Menu, X } from 'lucide-react';

type HeaderProps = {
  overlay?: boolean;
};

const navigation = [
  ['/', 'Home'],
  ['/properties', 'Properties'],
  ['/properties?category=House', 'House'],
  ['/properties?category=Condominium', 'Condo'],
  ['/properties?category=Lot', 'Lots'],
  ['/properties?category=Commercial', 'Commercial'],
  ['/properties?category=Rentals', 'Rentals'],
  ['/#contact', 'Contact'],
];

export function Header({ overlay: _overlay = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e7e9e6] bg-white/95 text-[#202522] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="shrink-0 text-[19px] font-bold tracking-[-0.04em]" aria-label="DGR Realty home">
          DGR Realty
        </Link>

        <nav className="hidden items-center gap-6 text-[13px] font-medium xl:flex" aria-label="Primary navigation">
          {navigation.map(([href, label]) => (
            <Link key={`${href}-${label}`} className="transition-colors hover:text-[#2f6b55]" href={href}>{label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/#contact" className="hidden rounded-full bg-[#24634e] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1b4f3e] sm:inline-flex">
            List a property
          </Link>
          <details className="mobile-menu relative xl:hidden">
            <summary className="grid h-10 w-10 place-items-center rounded-full border border-[#dfe2de] bg-white text-[#202522]">
              <Menu className="menu-open h-4 w-4" aria-hidden="true" />
              <X className="menu-close hidden h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Open navigation</span>
            </summary>
            <nav className="absolute right-0 top-12 w-64 rounded-2xl border border-[#e2e5e1] bg-white p-2 text-[#202522] shadow-[0_18px_50px_rgba(24,30,26,0.14)]" aria-label="Mobile navigation">
              {navigation.map(([href, label]) => (
                <Link key={`${href}-${label}`} href={href} className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-[#f3f5f2] hover:text-[#24634e]">
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
