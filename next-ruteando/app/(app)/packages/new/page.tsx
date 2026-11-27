import { PackageForm } from '@/components/packages/package-form';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page() {
  await requireRole(OPERATIONS_ROLES);
  return <PackageForm id={null} />;
}
