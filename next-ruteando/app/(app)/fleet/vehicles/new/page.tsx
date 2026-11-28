import { ResourceForm } from '@/components/fleet/resource-form';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireRole(ADMIN_ROLES);
  const { type } = await searchParams;
  return <ResourceForm id={null} createdTypeId={type ?? null} />;
}
