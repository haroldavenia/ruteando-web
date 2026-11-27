import { DriverForm } from '@/components/fleet/driver-form';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(ADMIN_ROLES);
  return <DriverForm id={(await params).id} />;
}
