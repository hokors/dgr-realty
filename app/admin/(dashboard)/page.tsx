import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, Clock3, KeyRound, Plus, Star } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { PropertyPublicationStatus, PropertyStatus } from '@/lib/types';

type DashboardProperty = {
  id: string;
  title: string;
  status: PropertyStatus;
  featured: boolean;
  publication_status: PropertyPublicationStatus;
  created_at: string;
};

const statDetails = [
  { key: 'total', label: 'Total listings', icon: Building2, tone: 'bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary-strong)]' },
  { key: 'Available', label: 'Available', icon: CheckCircle2, tone: 'bg-[var(--brand-success-soft)] text-[var(--brand-success)]' },
  { key: 'Reserved', label: 'Reserved', icon: Clock3, tone: 'bg-[var(--brand-accent-soft)] text-[#8b6a22]' },
  { key: 'Sold', label: 'Sold', icon: KeyRound, tone: 'bg-[#e8ebf4] text-[#4f5f91]' },
  { key: 'Rented', label: 'Rented', icon: HomeIcon, tone: 'bg-[#eee8f3] text-[#715284]' },
] as const;

function HomeIcon(props: { className?: string }) {
  return <Building2 {...props} />;
}

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = supabase
    ? await supabase.from('properties').select('id, title, status, featured, publication_status, created_at').order('created_at', { ascending: false })
    : { data: [] };
  const properties = (data as DashboardProperty[] | null) ?? [];
  const counts = properties.reduce<Record<string, number>>((totals, property) => {
    totals[property.status] = (totals[property.status] ?? 0) + 1;
    return totals;
  }, { total: properties.length });

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Overview</p><h1 className="display mt-3 text-4xl tracking-[-0.045em] sm:text-5xl">Admin dashboard</h1><p className="mt-3 text-sm text-[var(--brand-muted)]">A quick view of the DGR Realty property inventory.</p></div>
        <Link href="/admin/properties/new" className="flex items-center justify-center gap-2 self-start rounded-xl bg-[var(--brand-secondary-strong)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--brand-secondary-hover)]"><Plus className="h-4 w-4" /> Add property</Link>
      </div>

      <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Property statistics">
        {statDetails.map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
            <p className="mt-5 text-3xl font-bold tracking-[-0.04em]">{counts[key] ?? 0}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--brand-muted)]">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-5 py-4 sm:px-6"><div><h2 className="font-bold">Recently added</h2><p className="mt-1 text-xs text-[var(--brand-muted)]">Latest property records</p></div><Link href="/admin/properties" className="flex items-center gap-2 text-xs font-bold text-[var(--brand-secondary-strong)]">View all <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        {properties.length === 0 ? (
          <div className="px-6 py-14 text-center"><p className="text-sm font-semibold">No properties yet</p><p className="mt-2 text-xs text-[var(--brand-muted)]">Add the first property to begin managing inventory.</p></div>
        ) : (
          <div className="divide-y divide-[var(--brand-surface-muted)]">
            {properties.slice(0, 6).map((property) => (
              <div key={property.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{property.title}</p><p className="mt-1 text-xs text-[var(--brand-muted)]">{property.status} · {property.publication_status[0].toUpperCase() + property.publication_status.slice(1)}</p></div>
                {property.featured && <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--brand-accent-soft)] px-2.5 py-1 text-[10px] font-bold text-[#8a7135]"><Star className="h-3 w-3" fill="currentColor" /> Featured</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
