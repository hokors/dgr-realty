import type { Metadata } from 'next';
import { AdminPanel } from '@/components/AdminPanel';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Secure property management for authorized DGR Realty administrators.',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f1] text-[#17362c]">
      <Header />
      <section className="border-b border-[#dfe2dc] bg-[#e9e8e1]">
        <div className="mx-auto max-w-[1200px] px-6 py-14 sm:px-8 lg:px-12">
          <p className="eyebrow">Private workspace</p>
          <h1 className="display mt-4 text-5xl tracking-[-0.04em]">DGR Realty admin</h1>
        </div>
      </section>
      <section className="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
        <AdminPanel />
      </section>
      <Footer />
    </main>
  );
}
