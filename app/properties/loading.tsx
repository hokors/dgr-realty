export default function PropertiesLoading() {
  return (
    <main className="min-h-screen bg-[var(--brand-background)] px-6 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1440px] animate-pulse">
        <div className="h-4 w-28 rounded bg-[var(--brand-border)]" />
        <div className="mt-5 h-12 w-full max-w-xl rounded bg-[var(--brand-border)]" />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-white">
              <div className="aspect-[4/3] bg-[var(--brand-border)]" />
              <div className="space-y-3 p-6"><div className="h-4 w-24 rounded bg-[var(--brand-border)]" /><div className="h-6 w-4/5 rounded bg-[var(--brand-border)]" /><div className="h-4 w-32 rounded bg-[var(--brand-border)]" /></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
