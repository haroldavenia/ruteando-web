import { SettingsForm } from '@/components/settings/settings-form';
import { requireRole } from '@/lib/guard';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(ADMIN_ROLES);
  return <SettingsForm id={(await params).id} />;
}
