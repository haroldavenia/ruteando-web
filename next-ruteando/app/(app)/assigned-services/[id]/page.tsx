import { AssignedServiceForm } from '@/components/assigned/assigned-service-form';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(OPERATIONS_ROLES);
  return <AssignedServiceForm id={(await params).id} journey={null} route={null} />;
}
