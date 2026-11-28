import { PackageImport } from '@/components/packages/package-import';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page() {
  await requireRole(OPERATIONS_ROLES);
  return <PackageImport />;
}
