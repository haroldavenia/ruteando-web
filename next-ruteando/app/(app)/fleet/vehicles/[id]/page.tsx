import { ResourceForm } from '@/components/fleet/resource-form';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  await requireRole(ADMIN_ROLES);
  const { type } = await searchParams;
  return <ResourceForm id={(await params).id} createdTypeId={type ?? null} />;
}
