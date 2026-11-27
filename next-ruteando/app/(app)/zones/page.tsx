import { ZoneList } from '@/components/zones/zone-list';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page() {
  const user = await requireRole(ADMIN_ROLES);
  return <ZoneList tenantId={user.tenantId} />;
}
