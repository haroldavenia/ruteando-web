import { AssignedServicesMap } from '@/components/assigned/assigned-services-map';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page() {
  await requireRole(OPERATIONS_ROLES);
  return <AssignedServicesMap />;
}
