'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNotify } from '@/components/ui/toast';
import type { DomainWaypoint, Package } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { useT } from '@/lib/i18n/client';
import {
  filterVisits,
  hasFilters,
  NO_FILTERS,
  type RouteVisit,
  type VisitFilters,
  visitProgress,
  visitsOf,
} from '@/lib/journeys/visit-filters';
import { packageStatusLabel } from '@/lib/packages/labels';
import { setPackageStatus } from '@/lib/packages/status-change';

import { useConfirm } from './use-confirm';

/** Paquetes que se piden a la vez: el gateway no tiene un endpoint por lotes. */
export const VISITS_CONCURRENCY = 6;

/**
 * Estado de las visitas de una ruta. Las visitas son las paradas con paquete; el estado de cada una se lee del paquete (una petición por
 * paquete, de a `VISITS_CONCURRENCY`) y se cambia con `PATCH /packages/{id}/status/{status}`. El cambio es pesimista: la fila solo cambia
 * cuando el gateway responde bien. Cancelar pide confirmación.
 */
export function useRouteVisits(waypoints: readonly DomainWaypoint[]) {
  const t = useT();
  const notify = useNotify();
  const { ask, dialog } = useConfirm();
  const [visits, setVisits] = useState<RouteVisit[]>(() => visitsOf(waypoints));
  const [filters, setFilters] = useState<VisitFilters>(NO_FILTERS);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const patch = useCallback((packageId: string, changes: Partial<RouteVisit>) => {
    setVisits((all) => all.map((v) => (v.packageId === packageId ? { ...v, ...changes } : v)));
  }, []);

  // Lee los paquetes de las visitas (otra ruta o «Actualizar» vuelve a leerlos y conserva los filtros)
  useEffect(() => {
    let current = true;
    const initial = visitsOf(waypoints);
    // Una ruta distinta (o una recarga) empieza otra vez: las filas vuelven a «cargando»
    queueMicrotask(() => current && setVisits(initial));
    const ids = [...new Set(initial.map((v) => v.packageId))];
    let next = 0;
    async function worker() {
      while (next < ids.length && current) {
        const id = ids[next++]!;
        let pkg: Package | null = null;
        try {
          pkg = await getData<Package>(`packages/${encodeURIComponent(id)}`, t);
        } catch {
          pkg = null;
        }
        if (current) patch(id, { state: pkg ? 'ready' : 'unavailable', pkg });
      }
    }
    void Promise.all(Array.from({ length: Math.min(VISITS_CONCURRENCY, ids.length) }, worker));
    return () => {
      current = false;
    };
  }, [waypoints, version, t, patch]);

  const label = (visit: RouteVisit) => visit.pkg?.guideNumber?.trim() || visit.pkg?.name || visit.packageId;

  async function change(visit: RouteVisit, status: string) {
    if (visit.state !== 'ready' || busy.has(visit.packageId)) return;
    setError(null);
    if (status === 'cancelled') {
      const ok = await ask({
        title: t('Cancelar paquete'),
        message: t('¿Cancelar el paquete «{0}»?', [label(visit)]),
        confirmLabel: t('Cancelar paquete'),
        danger: true,
      });
      if (!ok) return;
    }
    setBusy((ids) => new Set(ids).add(visit.packageId));
    try {
      const updated = await setPackageStatus(visit.packageId, status, t);
      patch(visit.packageId, { pkg: { ...visit.pkg!, ...updated, status: updated.status ?? status } });
      notify(t('La visita «{0}» ahora está {1}', [label(visit), packageStatusLabel(status, t).toLowerCase()]));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setBusy((ids) => {
        const rest = new Set(ids);
        rest.delete(visit.packageId);
        return rest;
      });
    }
  }

  return {
    visits,
    filters,
    filtered: useMemo(() => filterVisits(visits, filters), [visits, filters]),
    filtering: hasFilters(filters),
    progress: visitProgress(visits),
    pending: visits.filter((v) => v.state === 'loading').length,
    busy,
    error,
    label,
    change,
    reload: () => setVersion((v) => v + 1),
    setStatusFilter: (status: string) => setFilters((f) => ({ ...f, status })),
    setTextFilter: (text: string) => setFilters((f) => ({ ...f, text })),
    clearFilters: () => setFilters(NO_FILTERS),
    dialog,
  };
}
