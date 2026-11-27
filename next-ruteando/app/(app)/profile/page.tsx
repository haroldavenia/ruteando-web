import { Profile } from '@/components/profile/profile';
import { requireRole } from '@/lib/guard';
import { ALL_ROLES } from '@/lib/roles';

export default async function Page() {
  const user = await requireRole(ALL_ROLES);
  return <Profile user={user} />;
}
