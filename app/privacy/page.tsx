import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { getPublicContactDetails } from '@/lib/contact';

export const metadata: Metadata = {
  title: 'Privacy Notice',
  description: 'How DGR Realty collects, uses, shares, protects, and retains personal information.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  const contact = getPublicContactDetails();

  return (
    <main className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)]">
      <Header />
      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="eyebrow">Privacy</p>
        <h1 className="display mt-3 text-4xl tracking-[-0.045em] sm:text-6xl">Privacy Notice</h1>
        <p className="mt-4 text-sm text-[var(--brand-muted)]">Last updated October 1, 2026</p>

        <div className="mt-10 space-y-9 rounded-3xl border border-[var(--brand-border)] bg-white p-6 text-[15px] leading-7 text-[var(--brand-muted)] sm:p-10">
          <section>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">Who is responsible for your information</h2>
            <p className="mt-3"><strong className="font-semibold text-[var(--brand-text)]">DGR Realty, operated by {contact.brokerName},</strong> is the personal information controller for inquiries submitted through this website. Privacy questions and requests may be sent to <a href={contact.privacyEmailHref} className="font-semibold text-[var(--brand-secondary-strong)] underline underline-offset-2">{contact.privacyEmail}</a>{contact.phone && contact.phoneHref ? <> or made by phone at <a href={contact.phoneHref} className="font-semibold text-[var(--brand-secondary-strong)] underline underline-offset-2">{contact.phone}</a></> : null}.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">Information we collect</h2>
            <p className="mt-3">When you send an inquiry, we collect your name, email address, optional phone number, property interests, preferred location, message, consent record, and the property you asked about. We also process limited technical data, including an IP-derived security fingerprint, browser information, submission timing, and spam-check results, to protect the service.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">Why and how we use it</h2>
            <p className="mt-3">With your consent, we use the details you submit to respond, discuss relevant properties, arrange viewings, and maintain a record of our communication. We process limited technical information to prevent abuse and protect the website and our records. We do not sell personal information, use it for unrelated direct marketing, or make decisions with legal or similarly significant effects solely through automated processing.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">Service providers and disclosures</h2>
            <p className="mt-3">Authorized DGR Realty personnel may access inquiries for follow-up. Supabase provides database, authentication, and file storage services; Vercel hosts the website and provides website analytics; Cloudflare Turnstile may check submissions for automated abuse; and Resend may deliver inquiry notifications. These providers process information on our behalf to operate and secure the service. Depending on provider infrastructure, information may be processed outside the Philippines subject to applicable safeguards.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">Retention</h2>
            <p className="mt-3">We ordinarily retain inquiry records for up to two years after the inquiry is resolved or our last interaction with you, then securely delete or anonymize them. We may retain specific records longer when reasonably necessary to comply with law, establish or defend legal claims, prevent fraud, or resolve a dispute.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">Your privacy rights</h2>
            <p className="mt-3">Subject to applicable law, you may ask to be informed about processing, access your information, correct inaccurate information, object to or withdraw consent for processing, request erasure or blocking, obtain portable data where applicable, and seek damages. We may need to verify your identity before completing a request.</p>
            <p className="mt-3">Send a request to <a href={contact.privacyEmailHref} className="font-semibold text-[var(--brand-secondary-strong)] underline underline-offset-2">{contact.privacyEmail}</a>. You may also lodge a complaint with the <a href="https://privacy.gov.ph/filing-a-complaint/" target="_blank" rel="noreferrer" className="font-semibold text-[var(--brand-secondary-strong)] underline underline-offset-2">National Privacy Commission</a>.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">Changes to this notice</h2>
            <p className="mt-3">We may update this notice when our services or processing practices change. The latest version and its update date will remain available on this page.</p>
          </section>
        </div>
      </article>
      <Footer />
    </main>
  );
}
