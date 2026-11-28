'use client';

import { RiDeleteBinLine, RiTaskLine } from '@remixicon/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { useNotify } from '@/components/ui/toast';
import type { AssignedService } from '@/lib/api/models';
import { getData, requestJson } from '@/lib/api-client';
import { isForRoute, readAssignment } from '@/lib/assigned/contract';
import {
  type AssignmentLookups,
  dateLabel,
  driverLabel,
  EMPTY_LOOKUPS,
  loadLookups,
  stateLabel,
  vehicleName,
} from '@/lib/assigned/lookups';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { useLang, useT } from '@/lib/i18n/client';
import { statusTone } from '@/lib/status-tone';

/**
 * A quién está asignada una ruta (vehículo, conductor y fecha), con lo necesario para cambiarlo o quitarlo, o para asignarla si todavía
 * no lo está. Los servicios asignados no se pueden pedir por ruta: se pide la lista y se busca.
 */
export function RouteAssignment({ journeyId, routeIndex }: { journeyId: string; routeIndex: number }) {
  const t = useT();
  const lang = useLang();
  const notify = useNotify();
  const { ask, dialog } = useConfirm();
  const [loaded, setLoaded] = useState(false);
  const [service, setService] = useState<AssignedService | null>(null);
  const [lookups, setLookups] = useState<AssignmentLookups>(EMPTY_LOOKUPS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const all = await getData<AssignedService[]>('assigned-services', t);
        const found = all.find((s) => isForRoute(s, journeyId, routeIndex)) ?? null;
        // Con el servicio ya localizado, se piden los nombres de su vehículo y su conductor
        const names = found ? await loadLookups(t) : EMPTY_LOOKUPS;
        if (!current) return;
        setService(found);
        setLookups(names);
      } catch (err) {
        if (current) setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
      } finally {
        if (current) setLoaded(true);
      }
    })();
    return () => {
      current = false;
    };
  }, [t, journeyId, routeIndex]);

  async function remove(current: AssignedService) {
    setError(null);
    const name = t('Ruta {0}', [routeIndex + 1]);
    const ok = await ask({
      title: t('Eliminar {0}', [t('servicio asignado')]),
      message: t('¿Eliminar {0} «{1}»? Esta acción no se puede deshacer.', [t('servicio asignado'), name]),
      confirmLabel: t('Eliminar'),
      danger: true,
    });
    if (!ok) return;
    try {
      await requestJson('DELETE', `/middleware/data/assigned-services/${encodeURIComponent(current.id)}`, undefined, t);
      notify(t('Se eliminó {0} «{1}»', [t('servicio asignado'), name]));
      setService(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    }
  }

  const refs = service ? readAssignment(service) : null;
  return (
    <div className="flex flex-col gap-3">
      <CardTitle id="assignment-title">{t('Servicio asignado')}</CardTitle>
      <FormResult error={error} />
      {loaded && service && refs ? (
        <>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm text-on-surface-variant">{t('Vehículo')}</dt>
              <dd className="font-medium">{vehicleName(lookups, refs.vehicleId)}</dd>
            </div>
            <div>
              <dt className="text-sm text-on-surface-variant">{t('Conductor')}</dt>
              <dd className="font-medium">{driverLabel(lookups, refs.driverId)}</dd>
            </div>
            <div>
              <dt className="text-sm text-on-surface-variant">{t('Fecha')}</dt>
              <dd className="font-medium">{dateLabel(refs.executionDate, lang)}</dd>
            </div>
            <div>
              <dt className="text-sm text-on-surface-variant">{t('Estado')}</dt>
              <dd>
                <StatusBadge tone={statusTone('assigned', service.state)}>{stateLabel(service.state, t)}</StatusBadge>
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/assigned-services/${encodeURIComponent(service.id)}`}
              className={buttonVariants({ variant: 'outlined' })}
            >
              {t('Cambiar')}
            </Link>
            <Button variant="outlined" onClick={() => void remove(service)}>
              <Icon icon={RiDeleteBinLine} size={20} />
              {t('Quitar asignación')}
            </Button>
          </div>
        </>
      ) : null}
      {loaded && !service ? (
        <>
          <p>{t('Esta ruta todavía no está asignada a un vehículo y un conductor.')}</p>
          <div>
            <Link
              href={`/assigned-services/new?journey=${encodeURIComponent(journeyId)}&route=${routeIndex}`}
              className={buttonVariants({ variant: 'primary' })}
            >
              <Icon icon={RiTaskLine} size={20} />
              {t('Asignar ruta')}
            </Link>
          </div>
        </>
      ) : null}
      {dialog}
    </div>
  );
}
