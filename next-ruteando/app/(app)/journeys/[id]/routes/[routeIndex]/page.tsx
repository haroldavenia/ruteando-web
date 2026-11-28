import { RouteDetail } from '@/components/journeys/route-detail';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page({ params }: { params: Promise<{ id: string; routeIndex: string }> }) {
  await requireRole(OPERATIONS_ROLES);
  const { id, routeIndex } = await params;
  return <RouteDetail journeyId={id} routeIndex={routeIndex} />;
}
