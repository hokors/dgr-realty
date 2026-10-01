'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--brand-background)] px-6 text-center text-[var(--brand-text)]">
      <div>
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-5 text-5xl">We couldn’t load this page.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--brand-muted)]">Please try again. If the problem continues, contact DGR Realty directly.</p>
        <button onClick={reset} className="mt-7 rounded-xl bg-[var(--brand-secondary-strong)] px-6 py-3.5 text-sm font-semibold text-white">Try again</button>
      </div>
    </main>
  );
}
