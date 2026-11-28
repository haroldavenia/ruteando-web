import { CatalogList } from '@/components/catalogs/catalog-list';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page() {
  await requireRole(ADMIN_ROLES);
  return <CatalogList />;
}
