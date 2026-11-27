'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { RoutesMap, type StopRef } from '@/components/map/routes-map';
import { FormHead } from '@/components/page/form-kit';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import type { AssignedService, DomainRoute, PlannedJourney } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { readAssignment } from '@/lib/assigned/contract';
import { assignedRoutes } from '@/lib/assigned/routes';
import { useT } from '@/lib/i18n/client';
import { getJourney } from '@/lib/journeys/journey-api';

const JOURNEY_CONCURRENCY = 4;

/** Las rutas de los servicios asignados juntas en un mapa, cada una con su color y su leyenda. */
export function AssignedServicesMap() {
  const t = useT();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; routes: DomainRoute[]; missing: number }
  >({ status: 'loading' });
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [selectedStop, setSelectedStop] = useState<StopRef | null>(null);

  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const services = await getData<AssignedService[]>('assigned-services', t);
        const ids = [...new Set(services.map((s) => readAssignment(s).journeyId).filter((id): id is string => !!id))];
        const found = new Map<string, PlannedJourney>();
        let next = 0;
        async function worker() {
          while (next < ids.length) {
            const id = ids[next++]!;
            try {
              found.set(id, await getJourney(id, t));
            } catch {
              // una jornada que no se lee deja sus servicios fuera del mapa (se cuentan como «no se dibujan»)
            }
          }
        }
        await Promise.all(Array.from({ length: Math.min(JOURNEY_CONCURRENCY, ids.length) }, worker));
        const result = assignedRoutes(services, found);
        if (current) setState({ status: 'ready', routes: result.routes, missing: result.missing });
      } catch (err) {
        if (current)
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : t('No se pudo completar la solicitud'),
          });
      }
    })();
    return () => {
      current = false;
    };
  }, [t]);

  return (
    <>
      <FormHead
        title={t('Mapa de servicios asignados')}
        backLabel={t('Servicios asignados')}
        backHref="/assigned-services"
      />
      {state.status === 'loading' ? (
        <Card>
          <Loading label={t('Cargando el mapa…')} className="grid gap-3">
            <Skeleton className="h-64" />
          </Loading>
        </Card>
      ) : state.status === 'error' ? (
        <>
          <FormResult error={state.message} />
          <Link href="/assigned-services" className={buttonVariants({ variant: 'outlined' })}>
            {t('Volver al listado')}
          </Link>
        </>
      ) : state.routes.length === 0 ? (
        <Card className="flex flex-col items-start gap-3">
          <p>{t('Todavía no hay rutas asignadas que dibujar.')}</p>
          <Link href="/assigned-services/new" className={buttonVariants({ variant: 'primary' })}>
            {t('Asignar ruta')}
          </Link>
        </Card>
      ) : (
        <Card aria-labelledby="map-title" className="flex flex-col gap-3">
          <CardTitle id="map-title">{t('Rutas asignadas')}</CardTitle>
          {state.missing > 0 ? (
            <p role="status">
              {state.missing === 1
                ? t('1 servicio no se dibuja porque no se pudo leer su ruta.')
                : t('{0} servicios no se dibujan porque no se pudo leer su ruta.', [state.missing])}
            </p>
          ) : null}
          <RoutesMap
            routes={state.routes}
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
            selectedStop={selectedStop}
            onSelectStop={setSelectedStop}
          />
        </Card>
      )}
    </>
  );
}
