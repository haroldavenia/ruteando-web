'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm } from 'react-hook-form';

import { FormActions, FormHead, FormSection, RecordGate } from '@/components/page/form-kit';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { FormSelect } from '@/components/ui/form-select';
import { useNotify } from '@/components/ui/toast';
import type { AssignedService, AssignedServiceInput, DomainRoute } from '@/lib/api/models';
import { assignmentBody, readAssignment } from '@/lib/assigned/contract';
import { type AssignmentLookups, EMPTY_LOOKUPS, loadLookups } from '@/lib/assigned/lookups';
import { driverName, vehicleLabel } from '@/lib/fleet/labels';
import { useCrud } from '@/lib/hooks/use-crud';
import { useRecord } from '@/lib/hooks/use-record';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useT } from '@/lib/i18n/client';
import { getJourney } from '@/lib/journeys/journey-api';

interface Values {
  journeyId: string;
  routeIndex: string;
  vehicleId: string;
  driverId: string;
  executionDate: string;
}

/** Hoy en `AAAA-MM-DD` según el reloj local (lo que espera `<input type="date">`). */
function today(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Asignar una ruta de una jornada a un vehículo y un conductor para una fecha. Al elegir la ruta se propone su vehículo y, al elegir el
 * vehículo, su conductor; la persona puede cambiarlos. `journey` y `route` (de la dirección) dejan la ruta elegida.
 */
export function AssignedServiceForm({
  id,
  journey,
  route,
}: {
  id: string | null;
  journey: string | null;
  route: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const notify = useNotify();
  const api = useCrud<AssignedService, AssignedServiceInput>('assigned-services');
  const record = useRecord<AssignedService>(id, api.get);
  const [lookups, setLookups] = useState<AssignmentLookups>(EMPTY_LOOKUPS);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let current = true;
    void loadLookups(t).then((found) => {
      if (!current) return;
      setLookups(found);
      setLookupsLoaded(true);
    });
    return () => {
      current = false;
    };
  }, [t]);

  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      const required = t('Este campo es obligatorio');
      for (const field of ['journeyId', 'routeIndex', 'vehicleId', 'driverId', 'executionDate'] as const) {
        if (!values[field]) errors[field] = { type: 'required', message: required };
      }
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t]
  );

  const defaults = useMemo<Values>(() => {
    if (record.status === 'ready') {
      const refs = readAssignment(record.record);
      return {
        journeyId: refs.journeyId ?? '',
        routeIndex: refs.routeIndex === null ? '' : String(refs.routeIndex),
        vehicleId: refs.vehicleId ?? '',
        driverId: refs.driverId ?? '',
        executionDate: refs.executionDate ?? today(),
      };
    }
    return {
      journeyId: id === null ? (journey ?? '') : '',
      routeIndex: id === null && journey && /^\d+$/.test(route ?? '') ? (route as string) : '',
      vehicleId: '',
      driverId: '',
      executionDate: today(),
    };
  }, [record, id, journey, route]);

  return (
    <>
      <FormHead
        title={id === null ? t('Asignar ruta') : t('Editar servicio asignado')}
        backLabel={t('Servicios asignados')}
        backHref="/assigned-services"
      />
      <RecordGate state={record} backHref="/assigned-services">
        {(current) => (
          <Fields
            key={current?.id ?? 'new'}
            defaults={defaults}
            resolver={resolver}
            lookups={lookups}
            lookupsLoaded={lookupsLoaded}
            // Con `?journey=&route=` la ruta ya viene elegida: se propone su vehículo en cuanto se leen sus rutas
            preselect={id === null && journey && /^\d+$/.test(route ?? '') ? Number(route) : null}
            error={error}
            loading={loading}
            onSubmit={async (values) => {
              setLoading(true);
              setError(null);
              const body = assignmentBody(
                {
                  journeyId: values.journeyId,
                  routeIndex: Number(values.routeIndex),
                  vehicleId: values.vehicleId,
                  driverId: values.driverId,
                  executionDate: values.executionDate,
                },
                current?.state
              );
              try {
                if (id === null) await api.create(body);
                else await api.update(id, body);
                notify(id === null ? t('Ruta asignada') : t('Servicio asignado guardado'));
                router.push('/assigned-services');
              } catch (err) {
                setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
                setLoading(false);
              }
            }}
          />
        )}
      </RecordGate>
    </>
  );
}

function Fields({
  defaults,
  resolver,
  lookups,
  lookupsLoaded,
  preselect,
  error,
  loading,
  onSubmit,
}: {
  defaults: Values;
  resolver: Resolver<Values>;
  lookups: AssignmentLookups;
  lookupsLoaded: boolean;
  preselect: number | null;
  error: string | null;
  loading: boolean;
  onSubmit: (values: Values) => Promise<void>;
}) {
  const t = useT();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver, defaultValues: defaults });
  useUnsavedWarning(isDirty && !loading);
  const [routes, setRoutes] = useState<readonly DomainRoute[]>([]);
  // Con una jornada ya elegida al abrir (editar, o `?journey=`) sus rutas se están leyendo desde el primer pintado
  const [routesLoading, setRoutesLoading] = useState(!!defaults.journeyId);
  const dirty = { shouldDirty: true, shouldValidate: true } as const;

  const pickVehicle = useCallback(
    (vehicleId: string) => {
      const driverId = lookups.resources.find((r) => r.id === vehicleId)?.driverId;
      if (driverId) setValue('driverId', driverId, dirty);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dirty` es una constante
    [lookups, setValue]
  );
  /** La ruta propone su vehículo (el que planificó el gateway) y este, su conductor. */
  const pickRoute = useCallback(
    (routeIndex: number, list: readonly DomainRoute[]) => {
      const resourceId = list.find((r) => r.routeIndex === routeIndex)?.resourceId;
      if (resourceId) {
        setValue('vehicleId', resourceId, dirty);
        pickVehicle(resourceId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dirty` es una constante
    [setValue, pickVehicle]
  );

  /** Deja las rutas leídas de la jornada y, si se pide, una elegida (con su vehículo y su conductor propuestos). */
  const applyRoutes = useCallback(
    (found: readonly DomainRoute[], select: number | null) => {
      setRoutes(found);
      if (select !== null && found.some((r) => r.routeIndex === select)) {
        setValue('routeIndex', String(select), dirty);
        pickRoute(select, found);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dirty` es una constante
    [setValue, pickRoute]
  );
  /** Trae las rutas de la jornada elegida (el gateway no tiene un endpoint de rutas). */
  const loadRoutes = useCallback(
    async (journeyId: string) => {
      setRoutesLoading(true);
      setRoutes([]);
      try {
        applyRoutes((await getJourney(journeyId, t)).routes, null);
      } catch {
        // sin rutas no se puede elegir ninguna: el selector queda vacío
      } finally {
        setRoutesLoading(false);
      }
    },
    [t, applyRoutes]
  );

  // Al abrir con una jornada ya elegida (editar, o `?journey=`) se leen sus rutas
  const initialJourney = defaults.journeyId;
  useEffect(() => {
    if (!initialJourney) return;
    let current = true;
    getJourney(initialJourney, t).then(
      (found) => {
        if (!current) return;
        applyRoutes(found.routes, preselect);
        setRoutesLoading(false);
      },
      () => current && setRoutesLoading(false)
    );
    return () => {
      current = false;
    };
    // solo al montar: cambiar de jornada lo hace el selector
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <FormSection title={t('Ruta')}>
          <FormSelect
            control={control}
            name="journeyId"
            label={t('Jornada')}
            error={errors.journeyId?.message}
            onChange={(event) => {
              setValue('routeIndex', '', dirty);
              void loadRoutes(event.target.value);
            }}
          >
            <option value="" />
            {lookups.journeys.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FormSelect>
          {lookupsLoaded && lookups.journeys.length === 0 ? (
            <p className="text-sm text-on-surface-variant sm:col-span-2">
              {t('Todavía no hay jornadas. Primero')}{' '}
              <Link href="/journeys/new" className="text-primary underline">
                {t('planifica una')}
              </Link>
              .
            </p>
          ) : null}
          <FormSelect
            control={control}
            name="routeIndex"
            label={t('Ruta')}
            error={errors.routeIndex?.message}
            hint={routesLoading ? t('Cargando las rutas…') : undefined}
            onChange={(event) => pickRoute(Number(event.target.value), routes)}
          >
            <option value="" />
            {routes.map((item) => (
              <option key={item.routeIndex} value={item.routeIndex}>
                {item.name}
              </option>
            ))}
          </FormSelect>
        </FormSection>

        <FormSection title={t('Vehículo y conductor')}>
          <FormSelect
            control={control}
            name="vehicleId"
            label={t('Vehículo')}
            error={errors.vehicleId?.message}
            onChange={(event) => pickVehicle(event.target.value)}
          >
            <option value="" />
            {lookups.resources.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicleLabel(vehicle)}
              </option>
            ))}
          </FormSelect>
          <FormSelect control={control} name="driverId" label={t('Conductor')} error={errors.driverId?.message}>
            <option value="" />
            {lookups.drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driverName(driver)}
              </option>
            ))}
          </FormSelect>
          <Input
            label={t('Fecha del servicio')}
            type="date"
            error={errors.executionDate?.message}
            {...register('executionDate')}
          />
        </FormSection>

        <FormResult error={error} />
        <FormActions cancelHref="/assigned-services" loading={loading} dirty={isDirty} />
      </Form>
    </Card>
  );
}
