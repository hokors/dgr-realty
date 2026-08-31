'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f9f7] px-6 text-center text-[#202522]">
      <div>
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-5 text-5xl">We couldn’t load this page.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#68716b]">Please try again. If the problem continues, contact DGR Realty directly.</p>
        <button onClick={reset} className="mt-7 rounded-xl bg-[#24634e] px-6 py-3.5 text-sm font-semibold text-white">Try again</button>
      </div>
    </main>
  );
}
