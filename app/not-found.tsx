import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f8f9f7] text-[#202522]">
      <Header />
      <section className="grid min-h-[70vh] place-items-center px-6 py-24 text-center">
        <div>
          <p className="eyebrow">404 · Not found</p>
          <h1 className="display mt-5 text-5xl tracking-[-0.04em] sm:text-6xl">This property is no longer here.</h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#68716b]">It may have moved, or the address may be incomplete. The current DGR Realty collection is ready to explore.</p>
          <Link href="/properties" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#24634e] px-6 py-3.5 text-sm font-semibold text-white"><ArrowLeft className="h-4 w-4" /> Browse properties</Link>
        </div>
      </section>
    </main>
  );
}
