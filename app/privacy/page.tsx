import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { getPublicContactDetails } from '@/lib/contact';

export const metadata: Metadata = {
  title: 'Privacy Notice',
  description: 'How DGR Realty collects and uses personal information submitted through property inquiries.',
};

export default function PrivacyPage() {
  const contact = getPublicContactDetails();

  return (
    <main className="min-h-screen bg-[#f8f9f7] text-[#202522]">
      <Header />
      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="eyebrow">Privacy</p>
        <h1 className="display mt-3 text-4xl tracking-[-0.045em] sm:text-6xl">Privacy Notice</h1>
        <p className="mt-4 text-sm text-[#727a75]">Effective September 1, 2026</p>

        <div className="mt-10 space-y-9 rounded-3xl border border-[#e1e5e1] bg-white p-6 text-[15px] leading-7 text-[#59615c] sm:p-10">
          <section>
            <h2 className="text-xl font-bold text-[#202522]">Information we collect</h2>
            <p className="mt-3">When you send an inquiry, DGR Realty collects the contact details and message you provide, along with the property you asked about. We also process limited technical data needed to prevent spam and protect the service.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#202522]">How we use it</h2>
            <p className="mt-3">We use your information to respond to your request, manage property leads, arrange viewings, maintain service security, and keep a record of our communication. We do not sell inquiry information.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#202522]">Service providers</h2>
            <p className="mt-3">Inquiry records are stored using Supabase. DGR Realty may use Resend to deliver inquiry notifications and Cloudflare Turnstile to detect automated abuse. These providers process information only to deliver those services.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#202522]">Retention and your choices</h2>
            <p className="mt-3">We keep inquiries only as long as reasonably needed for follow-up, business records, and security. You may ask to access, correct, or delete your inquiry information, subject to applicable legal requirements.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#202522]">Contact</h2>
            <p className="mt-3">Questions or privacy requests can be sent through the inquiry form{contact.email && contact.emailHref ? <> or by email at <a href={contact.emailHref} className="font-semibold text-[#24634e] underline underline-offset-2">{contact.email}</a></> : ''}.</p>
          </section>
        </div>
      </article>
      <Footer />
    </main>
  );
}
