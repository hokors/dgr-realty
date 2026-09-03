'use client';

import { FormEvent, useState } from 'react';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        }),
      });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Unable to sign in.');
      router.replace('/admin');
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Unable to sign in.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={signIn} className="w-full max-w-md rounded-3xl border border-[#dde2de] bg-white p-7 shadow-[0_24px_70px_rgba(23,54,44,0.12)] sm:p-9">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e5efe9] text-[#24634e]"><LockKeyhole className="h-5 w-5" /></div>
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.15em] text-[#24634e]">Private workspace</p>
      <h1 className="display mt-3 text-4xl tracking-[-0.045em]">Administrator login</h1>
      <p className="mt-3 text-sm leading-6 text-[#69716c]">Sign in with an authorized DGR Realty admin account.</p>

      <div className="mt-8 space-y-4">
        <label><span className="field-label">Email address</span><input name="email" type="email" required autoComplete="email" className="form-field" /></label>
        <label><span className="field-label">Password</span><input name="password" type="password" required autoComplete="current-password" className="form-field" /></label>
      </div>

      {error && <p className="mt-4 rounded-xl bg-[#f9e9e7] px-4 py-3 text-sm text-[#913d36]" role="alert">{error}</p>}

      <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#24634e] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#1b4f3e] disabled:opacity-60">
        {loading && <LoaderCircle className="h-4 w-4 animate-spin" />} Sign in securely
      </button>
    </form>
  );
}
