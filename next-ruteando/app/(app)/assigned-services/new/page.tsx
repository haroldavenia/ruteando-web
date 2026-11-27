import { AssignedServiceForm } from '@/components/assigned/assigned-service-form';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page({ searchParams }: { searchParams: Promise<{ journey?: string; route?: string }> }) {
  await requireRole(OPERATIONS_ROLES);
  const { journey, route } = await searchParams;
  return <AssignedServiceForm id={null} journey={journey ?? null} route={route ?? null} />;
}
