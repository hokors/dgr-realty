'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, ImagePlus, LoaderCircle, LogOut, Plus, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type AdminProperty = {
  id: string;
  title: string;
  status: string;
  featured: boolean;
  listing_type: string;
};

type Category = { id: string; name: string };

const statuses = ['Available', 'Reserved', 'Sold', 'Rented', 'Under Negotiation'];

export function AdminPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAdminData = async () => {
    if (!supabase) return;
    const [{ data: propertyRows }, { data: categoryRows }] = await Promise.all([
      supabase.from('properties').select('id, title, status, featured, listing_type').order('created_at', { ascending: false }),
      supabase.from('property_categories').select('id, name').order('display_order'),
    ]);
    setProperties((propertyRows as AdminProperty[] | null) ?? []);
    setCategories((categoryRows as Category[] | null) ?? []);
  };

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      if (!supabase) {
        if (active) setChecking(false);
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        if (active) setChecking(false);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!active) return;
      setUserEmail(user.email ?? 'Signed-in user');
      setIsAdmin(profile?.role === 'admin');
      setChecking(false);
      if (profile?.role === 'admin') await loadAdminData();
    }
    checkAccess();
    return () => { active = false; };
  }, [supabase]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setMessage('');
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    if (error) return setMessage(error.message);
    window.location.reload();
  }

  async function signOut() {
    await supabase?.auth.signOut();
    window.location.reload();
  }

  async function createProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title'));
    const slug = String(form.get('slug')) || title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data, error } = await supabase.from('properties').insert({
      title,
      slug,
      description: String(form.get('description')),
      category_id: String(form.get('category_id')),
      listing_type: String(form.get('listing_type')),
      price: Number(form.get('price')),
      location: String(form.get('location')),
      city: String(form.get('city')),
      province: String(form.get('province')),
      status: 'Available',
      featured: false,
    }).select('id').single();

    if (error || !data) {
      setSaving(false);
      return setMessage(error?.message ?? 'Unable to create property.');
    }

    const file = form.get('image');
    if (file instanceof File && file.size > 0) {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      const path = `${data.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('property-images').upload(path, file);
      if (!uploadError) {
        const { data: publicImage } = supabase.storage.from('property-images').getPublicUrl(path);
        await supabase.from('property_images').insert({ property_id: data.id, image_url: publicImage.publicUrl, storage_path: path, display_order: 0, alt_text: title });
      }
    }

    event.currentTarget.reset();
    setMessage('Property created successfully.');
    await loadAdminData();
    setSaving(false);
  }

  async function updateProperty(id: string, updates: Partial<AdminProperty>) {
    if (!supabase) return;
    const { error } = await supabase.from('properties').update(updates).eq('id', id);
    if (error) return setMessage(error.message);
    setProperties((rows) => rows.map((row) => row.id === id ? { ...row, ...updates } : row));
  }

  async function removeProperty(id: string, title: string) {
    if (!supabase || !window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) return setMessage(error.message);
    setProperties((rows) => rows.filter((row) => row.id !== id));
  }

  if (checking) return <div className="flex items-center gap-3 py-16 text-sm text-[#66716a]"><LoaderCircle className="h-5 w-5 animate-spin" /> Checking secure access…</div>;

  if (!supabase) {
    return (
      <div className="rounded-[24px] border border-[#d7dbd4] bg-white p-7 sm:p-10">
        <ShieldCheck className="h-8 w-8 text-[#9b844a]" />
        <h2 className="display mt-5 text-3xl">Admin foundation is ready.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#66716a]">Connect the Supabase environment variables to activate secure sign-in, property management, and image uploads. The database migration and storage policies are included with the project.</p>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <form onSubmit={signIn} className="max-w-md rounded-[24px] border border-[#d7dbd4] bg-white p-7 shadow-[0_18px_50px_rgba(23,54,44,0.08)] sm:p-9">
        <ShieldCheck className="h-8 w-8 text-[#9b844a]" />
        <h2 className="display mt-5 text-3xl">Administrator sign in</h2>
        <p className="mt-3 text-sm leading-6 text-[#66716a]">Authorized DGR Realty team members can manage listings here.</p>
        <div className="mt-7 space-y-3">
          <label className="block"><span className="sr-only">Email</span><input name="email" type="email" required placeholder="Email address" className="form-field" /></label>
          <label className="block"><span className="sr-only">Password</span><input name="password" type="password" required placeholder="Password" className="form-field" /></label>
        </div>
        {message && <p className="mt-3 text-sm text-[#9a3f38]" role="alert">{message}</p>}
        <button className="mt-5 w-full rounded-full bg-[#17362c] px-5 py-3.5 text-sm font-semibold text-white">Sign in</button>
      </form>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-[24px] border border-[#d7dbd4] bg-white p-8">
        <h2 className="display text-3xl">Access not authorized.</h2>
        <p className="mt-3 text-sm text-[#66716a]">{userEmail} is signed in, but does not have the admin role.</p>
        <button onClick={signOut} className="mt-6 rounded-full border border-[#cfd4cd] px-5 py-3 text-sm font-semibold">Sign out</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs text-[#66716a]">Signed in as {userEmail}</p><h2 className="display mt-2 text-4xl">Property management</h2></div>
        <button onClick={signOut} className="flex items-center gap-2 self-start rounded-full border border-[#cfd4cd] px-4 py-2.5 text-sm font-semibold"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>

      <details className="group rounded-[24px] border border-[#d7dbd4] bg-white p-6 sm:p-8">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold"><span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add a property</span><span className="text-xs font-normal text-[#66716a] group-open:hidden">Open form</span></summary>
        <form onSubmit={createProperty} className="mt-7 grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="field-label">Title</span><input name="title" required className="form-field" /></label>
          <label><span className="field-label">Custom slug (optional)</span><input name="slug" className="form-field" /></label>
          <label><span className="field-label">Price (PHP)</span><input name="price" type="number" min="0" required className="form-field" /></label>
          <label><span className="field-label">Category</span><select name="category_id" required className="form-field"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label><span className="field-label">Listing type</span><select name="listing_type" className="form-field"><option>For Sale</option><option>For Rent</option></select></label>
          <label><span className="field-label">Location</span><input name="location" required className="form-field" /></label>
          <label><span className="field-label">City</span><input name="city" required className="form-field" /></label>
          <label><span className="field-label">Province</span><input name="province" defaultValue="Pampanga" required className="form-field" /></label>
          <label><span className="field-label">Main image</span><span className="relative flex h-12 items-center gap-2 rounded-xl border border-[#d9ddd6] px-4 text-sm text-[#66716a]"><ImagePlus className="h-4 w-4" /> Upload photo<input name="image" type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" /></span></label>
          <label className="md:col-span-2"><span className="field-label">Description</span><textarea name="description" rows={4} required className="form-field resize-none" /></label>
          <button disabled={saving} className="flex items-center justify-center gap-2 rounded-full bg-[#17362c] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create property</button>
        </form>
      </details>

      {message && <p className="flex items-center gap-2 rounded-xl bg-[#e3e9e3] px-4 py-3 text-sm" role="status"><Check className="h-4 w-4" /> {message}</p>}

      <div className="overflow-hidden rounded-[24px] border border-[#d7dbd4] bg-white">
        <div className="border-b border-[#e3e5e0] px-6 py-5"><p className="font-semibold">Current listings <span className="ml-2 text-xs font-normal text-[#78817b]">{properties.length}</span></p></div>
        {properties.length === 0 ? <p className="px-6 py-12 text-center text-sm text-[#66716a]">No properties have been added yet.</p> : (
          <div className="divide-y divide-[#e8e9e5]">
            {properties.map((property) => (
              <div key={property.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
                <div><p className="font-semibold">{property.title}</p><p className="mt-1 text-xs text-[#778079]">{property.listing_type}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={property.status} onChange={(event) => updateProperty(property.id, { status: event.target.value })} className="h-10 rounded-lg border border-[#d9ddd6] bg-white px-3 text-xs">
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <button onClick={() => updateProperty(property.id, { featured: !property.featured })} title={property.featured ? 'Remove from featured' : 'Mark as featured'} className={`grid h-10 w-10 place-items-center rounded-lg border ${property.featured ? 'border-[#caa75a] bg-[#f4ead1] text-[#8a7135]' : 'border-[#d9ddd6]'}`}><Star className="h-4 w-4" fill={property.featured ? 'currentColor' : 'none'} /></button>
                  <button onClick={() => removeProperty(property.id, property.title)} title="Delete property" className="grid h-10 w-10 place-items-center rounded-lg border border-[#e2c8c5] text-[#9a3f38]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
