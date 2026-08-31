import type { ReactNode } from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, Gauge, Home, Mail, Plus } from 'lucide-react';
import { SignOutButton } from '@/components/admin/SignOutButton';

const navigation = [
  { href: '/admin', label: 'Dashboard', icon: Gauge },
  { href: '/admin/properties', label: 'Properties', icon: Building2 },
  { href: '/admin/properties/new', label: 'Add property', icon: Plus },
  { href: '/admin/inquiries', label: 'Inquiries', icon: Mail },
];

export function AdminShell({ children, email }: { children: ReactNode; email: string }) {
  return (
    <div className="min-h-screen bg-[#f3f5f2] text-[#202522] lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="bg-[#17362c] px-5 py-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-6 lg:py-7">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin" className="text-lg font-bold tracking-[-0.04em]">DGR Realty</Link>
          <SignOutButton />
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:mt-10 lg:grid lg:overflow-visible" aria-label="Admin navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/68 transition hover:bg-white/10 hover:text-white">
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto hidden border-t border-white/10 pt-6 lg:block">
          <p className="truncate text-xs text-white/45">{email}</p>
          <Link href="/" target="_blank" className="mt-4 flex items-center gap-2 text-xs font-semibold text-white/65 hover:text-white">
            <Home className="h-4 w-4" /> View public site <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-14">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
