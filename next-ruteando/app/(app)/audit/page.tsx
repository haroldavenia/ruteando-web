import { Suspense } from 'react';

import { AuditScreen } from '@/components/audit/audit-screen';
import { requireRole } from '@/lib/guard';
import { OPERATIONS_ROLES } from '@/lib/roles';

export default async function Page() {
  const user = await requireRole(OPERATIONS_ROLES);
  // `useSearchParams` (los filtros viven en la dirección) exige un límite de Suspense al prerenderizar
  return (
    <Suspense>
      <AuditScreen role={user.role} />
    </Suspense>
  );
}
