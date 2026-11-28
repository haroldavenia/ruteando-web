import { ZoneForm } from '@/components/zones/zone-form';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page() {
  const user = await requireRole(ADMIN_ROLES);
  return <ZoneForm id={null} tenantId={user.tenantId} />;
}
