'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Mail, Search } from 'lucide-react';

export type InquiryRow = {
  id: string;
  property_title: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  preferred_location: string | null;
  message: string;
  source: 'homepage' | 'property';
  status: 'new' | 'contacted' | 'closed';
  notification_status: string;
  created_at: string;
};

const statuses: InquiryRow['status'][] = ['new', 'contacted', 'closed'];

export function InquiryManager({ initialInquiries }: { initialInquiries: InquiryRow[] }) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      const matchesQuery = !normalized || [inquiry.full_name, inquiry.email, inquiry.property_title, inquiry.interest].some((value) => value?.toLowerCase().includes(normalized));
      return matchesQuery && (status === 'all' || inquiry.status === status);
    });
  }, [inquiries, query, status]);

  async function updateStatus(id: string, nextStatus: InquiryRow['status']) {
    setMessage('');
    try {
      const response = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? 'Unable to update the inquiry.');
      setInquiries((rows) => rows.map((row) => row.id === id ? { ...row, status: nextStatus } : row));
    } catch (updateError) {
      setMessage(updateError instanceof Error ? updateError.message : 'Unable to update the inquiry.');
    }
  }

  return (
    <div>
      <div><p className="eyebrow">Lead inbox</p><h1 className="display mt-3 text-4xl tracking-[-0.045em] sm:text-5xl">Inquiries</h1><p className="mt-3 text-sm text-[var(--brand-muted)]">Review incoming messages and track follow-up.</p></div>

      <div className="mt-8 grid gap-3 rounded-2xl border border-[var(--brand-border)] bg-white p-4 md:grid-cols-[minmax(0,1fr)_190px]">
        <label className="relative"><span className="sr-only">Search inquiries</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or property" className="form-field pl-11" /></label>
        <label><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="form-field"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
      </div>

      {message && <p className="mt-4 rounded-xl bg-[var(--brand-error-soft)] px-4 py-3 text-sm text-[var(--brand-error)]" role="alert">{message}</p>}

      <div className="mt-5 space-y-4">
        {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--brand-border-strong)] bg-white px-6 py-16 text-center text-sm text-[var(--brand-muted)]">No inquiries match this view.</div> : filtered.map((inquiry) => (
          <article key={inquiry.id} className="rounded-2xl border border-[var(--brand-border)] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{inquiry.full_name}</h2>{inquiry.status === 'new' && <span className="rounded-full bg-[var(--brand-success-soft)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--brand-success)]">New</span>}</div><a href={`mailto:${inquiry.email}`} className="mt-2 flex items-center gap-2 text-sm text-[var(--brand-secondary-strong)]"><Mail className="h-4 w-4" /> {inquiry.email}</a>{inquiry.phone && <p className="mt-1 text-xs text-[var(--brand-muted)]">{inquiry.phone}</p>}</div>
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[var(--brand-muted)]" /><time suppressHydrationWarning className="text-xs text-[var(--brand-muted)]" dateTime={inquiry.created_at}>{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(inquiry.created_at))}</time></div>
            </div>
            <div className="mt-5 rounded-xl bg-[var(--brand-background)] p-4"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--brand-muted)]">{inquiry.property_title ?? inquiry.interest ?? 'General inquiry'}</p><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--brand-muted)]">{inquiry.message}</p>{inquiry.preferred_location && <p className="mt-3 text-xs text-[var(--brand-muted)]">Preferred location: {inquiry.preferred_location}</p>}</div>
            <div className="mt-5 flex flex-col gap-3 border-t border-[var(--brand-surface-muted)] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[var(--brand-muted)]">Email notification: {inquiry.notification_status.replace('_', ' ')}</p><label className="flex items-center gap-2 text-xs font-semibold"><CheckCircle2 className="h-4 w-4 text-[var(--brand-secondary-strong)]" /> Follow-up status<select value={inquiry.status} onChange={(event) => updateStatus(inquiry.id, event.target.value as InquiryRow['status'])} className="h-10 rounded-xl border border-[var(--brand-border)] bg-white px-3 text-xs">{statuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label></div>
          </article>
        ))}
      </div>
    </div>
  );
}
