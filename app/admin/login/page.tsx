import { redirect } from 'next/navigation';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { getAdminUser } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const admin = await getAdminUser();
  if (admin) redirect('/admin');

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--brand-surface-muted)] px-5 py-12 text-[var(--brand-text)]">
      <AdminLoginForm />
    </main>
  );
}
