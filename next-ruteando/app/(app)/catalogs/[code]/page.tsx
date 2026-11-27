import { CatalogDetail } from '@/components/catalogs/catalog-detail';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  await requireRole(ADMIN_ROLES);
  return <CatalogDetail code={(await params).code} />;
}
