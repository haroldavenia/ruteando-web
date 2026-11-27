import { DriverForm } from '@/components/fleet/driver-form';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page() {
  await requireRole(ADMIN_ROLES);
  return <DriverForm id={null} />;
}
