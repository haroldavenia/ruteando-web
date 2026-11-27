import { PackageForm } from '@/components/packages/package-form';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(OPERATIONS_ROLES);
  return <PackageForm id={(await params).id} />;
}
