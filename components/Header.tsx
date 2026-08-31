import Link from 'next/link';
import { Menu, X } from 'lucide-react';

type HeaderProps = {
  overlay?: boolean;
};

export function Header({ overlay = false }: HeaderProps) {
  const tone = overlay
    ? 'absolute inset-x-0 top-0 z-40 border-white/15 text-white'
    : 'relative z-40 border-[#dfe2dc] bg-[#f7f6f1]/95 text-[#17362c] backdrop-blur';

  return (
    <header className={`border-b ${tone}`}>
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="text-xl font-semibold tracking-[-0.045em]" aria-label="DGR Realty home">
          DGR Realty
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Primary navigation">
          <Link className="transition-opacity hover:opacity-60" href="/properties">Properties</Link>
          <Link className="transition-opacity hover:opacity-60" href="/#categories">Categories</Link>
          <Link className="transition-opacity hover:opacity-60" href="/#about">About</Link>
          <Link className="transition-opacity hover:opacity-60" href="/#contact">Contact</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/#contact"
            className={`hidden rounded-full border px-5 py-2.5 text-sm font-semibold transition sm:inline-flex ${
              overlay
                ? 'border-white/50 hover:bg-white hover:text-[#17362c]'
                : 'border-[#17362c] hover:bg-[#17362c] hover:text-white'
            }`}
          >
            List your property
          </Link>

          <details className="mobile-menu relative md:hidden">
            <summary className={`grid h-10 w-10 cursor-pointer place-items-center rounded-full border ${overlay ? 'border-white/40' : 'border-[#cfd4cd]'}`}>
              <Menu className="menu-open h-4 w-4" aria-hidden="true" />
              <X className="menu-close hidden h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Open navigation</span>
            </summary>
            <nav className="absolute right-0 top-12 w-60 rounded-2xl border border-[#dfe2dc] bg-[#f7f6f1] p-2 text-[#17362c] shadow-xl" aria-label="Mobile navigation">
              {[
                ['/properties', 'Properties'],
                ['/#categories', 'Categories'],
                ['/#about', 'About'],
                ['/#contact', 'Contact'],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-[#e9ebe4]">
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
