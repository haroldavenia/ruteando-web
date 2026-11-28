import { ResourceTypeForm } from '@/components/fleet/resource-type-form';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(ADMIN_ROLES);
  return <ResourceTypeForm id={(await params).id} returnTo={null} />;
}
