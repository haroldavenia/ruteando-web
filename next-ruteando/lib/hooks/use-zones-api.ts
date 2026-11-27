'use client';

import { useMemo } from 'react';

import type { Zone, ZoneInput } from '@/lib/api/models';
import { getData, requestJson } from '@/lib/api-client';
import { useT } from '@/lib/i18n/client';

/**
 * Zonas del tenant. El gateway las devuelve sin paginar y exige `tenantId` en casi todas las operaciones (llega del servidor: lo da la
 * sesión). Estable mientras no cambie el idioma.
 */
export function useZonesApi(tenantId: string) {
  const t = useT();
  return useMemo(() => {
    const q = `?tenantId=${encodeURIComponent(tenantId)}`;
    const one = (id: string) => `zones/${encodeURIComponent(id)}${q}`;
    return {
      list: () => getData<Zone[]>(`zones${q}`, t),
      get: (id: string) => getData<Zone>(one(id), t),
      create: (input: ZoneInput, messages?: Parameters<typeof requestJson>[4]) =>
        requestJson<Zone>('POST', `/middleware/data/zones${q}`, input, t, messages),
      update: (id: string, input: Partial<ZoneInput>, messages?: Parameters<typeof requestJson>[4]) =>
        requestJson<Zone>('PUT', `/middleware/data/${one(id)}`, input, t, messages),
      remove: (id: string, messages?: Parameters<typeof requestJson>[4]) =>
        requestJson<void>('DELETE', `/middleware/data/${one(id)}`, undefined, t, messages),
    };
  }, [tenantId, t]);
}
