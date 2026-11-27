import { JourneyDetail } from '@/components/journeys/journey-detail';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(OPERATIONS_ROLES);
  return <JourneyDetail id={(await params).id} />;
}
