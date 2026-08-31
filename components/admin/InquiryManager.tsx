'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Mail, Search } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

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
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setMessage('');
    const { error } = await supabase.from('inquiries').update({ status: nextStatus }).eq('id', id);
    if (error) setMessage(error.message);
    else setInquiries((rows) => rows.map((row) => row.id === id ? { ...row, status: nextStatus } : row));
  }

  return (
    <div>
      <div><p className="eyebrow">Lead inbox</p><h1 className="display mt-3 text-4xl tracking-[-0.045em] sm:text-5xl">Inquiries</h1><p className="mt-3 text-sm text-[#68716b]">Review incoming messages and track follow-up.</p></div>

      <div className="mt-8 grid gap-3 rounded-2xl border border-[#dde2de] bg-white p-4 md:grid-cols-[minmax(0,1fr)_190px]">
        <label className="relative"><span className="sr-only">Search inquiries</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b837e]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or property" className="form-field pl-11" /></label>
        <label><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="form-field"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
      </div>

      {message && <p className="mt-4 rounded-xl bg-[#fae8e6] px-4 py-3 text-sm text-[#923f38]" role="alert">{message}</p>}

      <div className="mt-5 space-y-4">
        {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d5dcd7] bg-white px-6 py-16 text-center text-sm text-[#707873]">No inquiries match this view.</div> : filtered.map((inquiry) => (
          <article key={inquiry.id} className="rounded-2xl border border-[#dde2de] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{inquiry.full_name}</h2>{inquiry.status === 'new' && <span className="rounded-full bg-[#e5f1e9] px-2.5 py-1 text-[10px] font-bold uppercase text-[#28744e]">New</span>}</div><a href={`mailto:${inquiry.email}`} className="mt-2 flex items-center gap-2 text-sm text-[#24634e]"><Mail className="h-4 w-4" /> {inquiry.email}</a>{inquiry.phone && <p className="mt-1 text-xs text-[#737c76]">{inquiry.phone}</p>}</div>
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#8a928d]" /><time suppressHydrationWarning className="text-xs text-[#737c76]" dateTime={inquiry.created_at}>{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(inquiry.created_at))}</time></div>
            </div>
            <div className="mt-5 rounded-xl bg-[#f6f8f6] p-4"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#78817b]">{inquiry.property_title ?? inquiry.interest ?? 'General inquiry'}</p><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4f5953]">{inquiry.message}</p>{inquiry.preferred_location && <p className="mt-3 text-xs text-[#737c76]">Preferred location: {inquiry.preferred_location}</p>}</div>
            <div className="mt-5 flex flex-col gap-3 border-t border-[#edf0ed] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#7b837e]">Email notification: {inquiry.notification_status.replace('_', ' ')}</p><label className="flex items-center gap-2 text-xs font-semibold"><CheckCircle2 className="h-4 w-4 text-[#24634e]" /> Follow-up status<select value={inquiry.status} onChange={(event) => updateStatus(inquiry.id, event.target.value as InquiryRow['status'])} className="h-10 rounded-xl border border-[#d9ddd6] bg-white px-3 text-xs">{statuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label></div>
          </article>
        ))}
      </div>
    </div>
  );
}
