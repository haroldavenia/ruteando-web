import { ResourceTypeForm } from '@/components/fleet/resource-type-form';
import { fleetReturnUrl } from '@/lib/fleet/type-handoff';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  await requireRole(ADMIN_ROLES);
  const { volver } = await searchParams;
  return <ResourceTypeForm id={null} returnTo={fleetReturnUrl(volver)} />;
}
