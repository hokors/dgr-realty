'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, CheckCircle2, LoaderCircle, Mail } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

type InquiryFormProps = {
  source: 'homepage' | 'property';
  propertyId?: string;
  propertyTitle?: string;
  variant?: 'home' | 'property';
};

export function InquiryForm({ source, propertyId, propertyTitle, variant = 'home' }: InquiryFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.get('fullName'),
          email: form.get('email'),
          phone: form.get('phone'),
          interest: form.get('interest'),
          preferredLocation: form.get('preferredLocation'),
          message: form.get('message'),
          propertyId,
          propertyTitle,
          source,
          consent: form.get('consent') === 'on',
          website: form.get('website'),
          startedAt: form.get('startedAt'),
          turnstileToken: form.get('cf-turnstile-response'),
        }),
      });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Unable to send your inquiry.');
      formElement.reset();
      setSuccess(true);
      setStartedAt(Date.now());
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to send your inquiry.');
      window.turnstile?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className={`grid place-items-center text-center ${variant === 'home' ? 'min-h-[440px] p-7 sm:p-10 lg:p-12' : 'py-8'}`} role="status">
        <div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e4f1e9] text-[#26734c]"><CheckCircle2 className="h-6 w-6" /></div><h3 className="mt-5 text-xl font-bold">Inquiry received</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#68716b]">Thank you. DGR Realty will review your message and contact you using the details provided.</p><button type="button" onClick={() => window.location.reload()} className="mt-5 text-sm font-bold text-[#24634e]">Send another inquiry</button></div>
      </div>
    );
  }

  const gridClass = variant === 'home' ? 'grid gap-4 p-7 sm:grid-cols-2 sm:p-10 lg:p-12' : 'mt-6 space-y-3';

  return (
    <form onSubmit={submitInquiry} className={gridClass}>
      {turnstileSiteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />}
      <input type="hidden" name="startedAt" value={startedAt} />
      <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">Company website<input name="website" tabIndex={-1} autoComplete="off" /></label>

      <label><span className="field-label">Name</span><input required minLength={2} maxLength={120} autoComplete="name" className="form-field" name="fullName" placeholder="Your full name" /></label>
      <label><span className="field-label">Email</span><input required maxLength={254} autoComplete="email" type="email" className="form-field" name="email" placeholder="you@example.com" /></label>
      <label><span className="field-label">Phone <span className="normal-case tracking-normal">(optional)</span></span><input maxLength={40} autoComplete="tel" type="tel" className="form-field" name="phone" placeholder="Your phone number" /></label>

      {variant === 'home' ? (
        <>
          <label><span className="field-label">I am interested in</span><select className="form-field" name="interest"><option>Buying a property</option><option>Renting a property</option><option>Selling a property</option><option>Listing a property</option></select></label>
          <label className="sm:col-span-2"><span className="field-label">Preferred location <span className="normal-case tracking-normal">(optional)</span></span><input maxLength={160} className="form-field" name="preferredLocation" placeholder="City or area" /></label>
        </>
      ) : <input type="hidden" name="interest" value="Property inquiry" />}

      <label className={variant === 'home' ? 'sm:col-span-2' : 'block'}><span className="field-label">Message</span><textarea required minLength={10} maxLength={3000} className="form-field min-h-32 resize-y" name="message" defaultValue={propertyTitle ? `I'm interested in ${propertyTitle}. Please share availability and viewing details.` : ''} placeholder="Tell us a little about what you need" /></label>

      <label className={`flex items-start gap-3 rounded-xl bg-[#f4f7f5] p-3.5 ${variant === 'home' ? 'sm:col-span-2' : ''}`}><input required name="consent" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#24634e]" /><span className="text-[11px] leading-5 text-[#66716a]">I agree that DGR Realty may use my details to respond to this inquiry, as described in the <Link href="/privacy" className="font-bold text-[#24634e] underline underline-offset-2">Privacy Notice</Link>.</span></label>

      {turnstileSiteKey && <div className={`cf-turnstile ${variant === 'home' ? 'sm:col-span-2' : ''}`} data-sitekey={turnstileSiteKey} data-theme="light" data-action="inquiry" />}
      {error && <p className={`rounded-xl bg-[#fae8e6] px-4 py-3 text-sm text-[#923f38] ${variant === 'home' ? 'sm:col-span-2' : ''}`} role="alert">{error}</p>}

      <button disabled={submitting} className={`flex items-center justify-center gap-2 rounded-xl bg-[#24634e] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#1b4f3e] disabled:cursor-not-allowed disabled:opacity-60 ${variant === 'home' ? 'sm:col-span-2' : 'w-full'}`}>
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : variant === 'property' ? <Mail className="h-4 w-4" /> : null}
        {submitting ? 'Sending inquiry…' : 'Send inquiry'}
        {!submitting && variant === 'home' && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
