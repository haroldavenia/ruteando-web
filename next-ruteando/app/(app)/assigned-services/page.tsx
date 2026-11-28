import { AssignedServiceList } from '@/components/assigned/assigned-service-list';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page() {
  await requireRole(OPERATIONS_ROLES);
  return <AssignedServiceList />;
}
