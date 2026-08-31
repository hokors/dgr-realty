import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminUser } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdminUser();
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
