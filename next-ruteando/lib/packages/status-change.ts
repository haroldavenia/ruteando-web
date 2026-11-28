import type { Package } from '@/lib/api/models';
import { requestJson } from '@/lib/api-client';
import type { TFunction } from '@/lib/i18n/core';

/** Cambia el estado de un paquete (`PATCH /packages/{id}/status/{status}`). */
export const setPackageStatus = (id: string, status: string, t: TFunction) =>
  requestJson<Package>(
    'PATCH',
    `/middleware/data/packages/${encodeURIComponent(id)}/status/${encodeURIComponent(status)}`,
    undefined,
    t
  );
