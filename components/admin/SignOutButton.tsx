'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  );
}
