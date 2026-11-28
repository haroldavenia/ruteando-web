import { PlaceList } from '@/components/places/place-list';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page() {
  await requireRole(ADMIN_ROLES);
  return <PlaceList />;
}
