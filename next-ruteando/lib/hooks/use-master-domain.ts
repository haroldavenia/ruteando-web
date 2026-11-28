'use client';

import { useEffect, useState } from 'react';

import type { MasterDomain, MasterDomainValue } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { useT } from '@/lib/i18n/client';

type ByCode = Readonly<Record<string, readonly MasterDomainValue[]>>;

const value = (key: string, label: string, sortOrder: number): MasterDomainValue => ({
  key,
  label,
  description: null,
  sortOrder,
  active: true,
});
const values = (...pairs: [string, string][]) => pairs.map(([k, l], i) => value(k, l, i + 1));

/** Valores por defecto (los del gateway) para pintar los formularios antes de cargar los reales o si falla la carga. */
export const MASTER_DOMAIN_DEFAULTS: ByCode = {
  OsrmProfile: values(['driving', 'Driving'], ['cycling', 'Cycling'], ['walking', 'Walking']),
  RouteTopology: values(
    ['depot_to_depot', 'Depot To Depot'],
    ['round_trip', 'Round Trip'],
    ['open_delivery', 'Open Delivery'],
    ['open_pickup', 'Open Pickup'],
    ['flexible', 'Flexible']
  ),
  PackageStatus: values(
    ['pending', 'Pending'],
    ['attended', 'Attended'],
    ['unattended', 'Unattended'],
    ['cancelled', 'Cancelled']
  ),
};

let cache: ByCode | null = null;
let inflight: Promise<ByCode> | null = null;
const listeners = new Set<(by: ByCode) => void>();

function toMap(domains: MasterDomain[]): ByCode {
  return Object.fromEntries(domains.map((domain) => [domain.code, domain.values]));
}

/** Carga los dominios una sola vez (el fallo no se cachea). */
export function loadMasterDomains(t: Parameters<typeof getData>[1]): Promise<ByCode> {
  if (cache) return Promise.resolve(cache);
  inflight ??= getData<MasterDomain[]>('master-domains', t)
    .then((res) => {
      cache = toMap(res);
      for (const listener of listeners) listener(cache);
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Vuelve a pedir los dominios (cambiaron en el gateway: se añadió o apagó un valor). */
export async function refreshMasterDomains(t: Parameters<typeof getData>[1]): Promise<ByCode> {
  cache = null;
  return loadMasterDomains(t);
}

/**
 * Los valores ACTIVOS de un dominio maestro del gateway (el gateway rechaza los inactivos como destino). Antes de cargar, o si falla, los
 * de `MASTER_DOMAIN_DEFAULTS`.
 */
export function useMasterDomain(code: string): {
  all: readonly MasterDomainValue[];
  active: readonly MasterDomainValue[];
} {
  const t = useT();
  const [by, setBy] = useState<ByCode>(cache ?? MASTER_DOMAIN_DEFAULTS);
  useEffect(() => {
    listeners.add(setBy);
    loadMasterDomains(t).then(setBy, () => undefined);
    return () => {
      listeners.delete(setBy);
    };
  }, [t]);
  const all = by[code] ?? [];
  return { all, active: all.filter((v) => v.active) };
}

/** Solo para pruebas: olvida lo cargado. */
export function resetMasterDomainsCache() {
  cache = null;
  inflight = null;
}
