'use client';

import { RiAddLine } from '@remixicon/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm } from 'react-hook-form';

import { FormActions, FormHead, FormSection, RecordGate } from '@/components/page/form-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { FormSelect } from '@/components/ui/form-select';
import { Icon } from '@/components/ui/icon';
import { useNotify } from '@/components/ui/toast';
import type { Place, Resource, ResourceInput, ResourceType } from '@/lib/api/models';
import { saveDraft, takeDraft } from '@/lib/fleet/type-handoff';
import { useCrud } from '@/lib/hooks/use-crud';
import { useRecord } from '@/lib/hooks/use-record';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useT } from '@/lib/i18n/client';
import {
  fromUtcIso,
  localDateOf,
  minutesToSeconds,
  secondsToMinutes,
  shiftErrors,
  todayLocalDate,
  toUtcIso,
} from '@/lib/time/shift-time';

/** Cuántos tipos y lugares se cargan en los selectores; si hay más, el formulario avisa. */
export const SELECT_LIMIT = 200;

interface Values {
  name: string;
  licensePlate: string;
  resourceTypeId: string;
  depotId: string;
  shiftStart: string;
  shiftDurationMin: string;
  breakDurationMin: string;
  quantity: string;
}

const DEFAULTS: Values = {
  name: '',
  licensePlate: '',
  resourceTypeId: '',
  depotId: '',
  shiftStart: '08:00',
  shiftDurationMin: '480',
  breakDurationMin: '60',
  quantity: '1',
};

/** Lo escrito más la fecha de anclaje del turno: lo que viaja al crear un tipo y volver. */
type Draft = Values & { anchorDate: string };

const isDraft = (value: unknown): value is Draft =>
  typeof value === 'object' &&
  value !== null &&
  (
    [
      'name',
      'licensePlate',
      'resourceTypeId',
      'depotId',
      'shiftStart',
      'shiftDurationMin',
      'breakDurationMin',
      'quantity',
      'anchorDate',
    ] as const
  ).every((key) => typeof (value as Record<string, unknown>)[key] === 'string');

/** Formulario de vehículo (alta y edición). `createdTypeId` es el tipo recién creado al volver de «Crear tipo». */
export function ResourceForm({ id, createdTypeId }: { id: string | null; createdTypeId: string | null }) {
  const t = useT();
  const router = useRouter();
  const notify = useNotify();
  const api = useCrud<Resource, ResourceInput>('resources');
  const typesApi = useCrud<ResourceType, never>('resource-types');
  const placesApi = useCrud<Place, never>('places');
  const record = useRecord<Resource>(id, api.get);
  const [types, setTypes] = useState<{ rows: readonly ResourceType[]; loaded: boolean; truncated: boolean }>({
    rows: [],
    loaded: false,
    truncated: false,
  });
  const [places, setPlaces] = useState<{ rows: readonly Place[]; loaded: boolean; truncated: boolean }>({
    rows: [],
    loaded: false,
    truncated: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [anchorDate, setAnchorDate] = useState(() => todayLocalDate());

  useEffect(() => {
    let current = true;
    typesApi.list(0, SELECT_LIMIT).then(
      (page) =>
        current && setTypes({ rows: page.content, loaded: true, truncated: page.totalElements > page.content.length }),
      () => current && setTypes((s) => ({ ...s, loaded: true }))
    );
    placesApi.list(0, SELECT_LIMIT).then(
      (page) =>
        current && setPlaces({ rows: page.content, loaded: true, truncated: page.totalElements > page.content.length }),
      () => current && setPlaces((s) => ({ ...s, loaded: true }))
    );
    return () => {
      current = false;
    };
  }, [typesApi, placesApi]);

  const defaults = useMemo<Values>(() => {
    if (record.status !== 'ready') return { ...DEFAULTS, ...(createdTypeId ? { resourceTypeId: createdTypeId } : {}) };
    const r = record.record;
    return {
      name: r.name,
      licensePlate: r.licensePlate ?? '',
      resourceTypeId: r.resourceTypeId,
      depotId: r.depotId,
      shiftStart: fromUtcIso(r.shiftStartUtc),
      shiftDurationMin: String(secondsToMinutes(r.shiftDurationSec)),
      breakDurationMin: String(secondsToMinutes(r.breakDurationSec)),
      quantity: String(r.quantity),
    };
  }, [record, createdTypeId]);

  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      const required = t('Este campo es obligatorio');
      for (const field of [
        'name',
        'resourceTypeId',
        'depotId',
        'shiftStart',
        'shiftDurationMin',
        'breakDurationMin',
        'quantity',
      ] as const) {
        if (!values[field].trim()) errors[field] = { type: 'required', message: required };
      }
      const duration = Number(values.shiftDurationMin);
      const rest = Number(values.breakDurationMin);
      if (!errors.shiftDurationMin) {
        const found = shiftErrors(duration, 0).find((e) => e !== 'breakNegative');
        if (found === 'shiftNotPositive')
          errors.shiftDurationMin = { type: found, message: t('La duración debe ser mayor que 0') };
        if (found === 'shiftTooLong') {
          errors.shiftDurationMin = {
            type: found,
            message: t('El turno no puede durar más de 24 horas (1440 minutos)'),
          };
        }
      }
      if (!errors.breakDurationMin && shiftErrors(1, rest).includes('breakNegative')) {
        errors.breakDurationMin = { type: 'breakNegative', message: t('El descanso no puede ser negativo') };
      }
      if (!errors.quantity && !(Number(values.quantity) >= 1)) {
        errors.quantity = { type: 'min', message: t('La cantidad debe ser al menos 1') };
      }
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t]
  );

  return (
    <>
      <FormHead
        title={id === null ? t('Nuevo vehículo') : t('Editar vehículo')}
        backLabel={t('Vehículos')}
        backHref="/fleet/vehicles"
      />
      <RecordGate state={record} backHref="/fleet/vehicles">
        {(current) => (
          <VehicleFields
            key={current?.id ?? 'new'}
            defaults={defaults}
            resolver={resolver}
            types={types}
            places={places}
            restoreDraft={id === null || current !== null}
            createdTypeId={createdTypeId}
            error={error}
            loading={loading}
            anchorDate={current ? localDateOf(current.shiftStartUtc) : anchorDate}
            onAnchor={setAnchorDate}
            onCreateType={(draft) => {
              saveDraft(draft);
              const here = id === null ? '/fleet/vehicles/new' : `/fleet/vehicles/${encodeURIComponent(id)}`;
              router.push(`/fleet/types/new?volver=${encodeURIComponent(here)}`);
            }}
            onSubmit={async (values, anchor) => {
              setLoading(true);
              setError(null);
              const plate = values.licensePlate.trim();
              const quantity = Number(values.quantity);
              const base: ResourceInput = {
                name: values.name.trim(),
                resourceTypeId: values.resourceTypeId,
                depotId: values.depotId,
                shiftStartUtc: toUtcIso(values.shiftStart, anchor),
                shiftDurationSec: minutesToSeconds(Number(values.shiftDurationMin)),
                breakDurationSec: minutesToSeconds(Number(values.breakDurationMin)),
              };
              try {
                // En el alta solo se envía lo que se aparta del valor por defecto del gateway. Al editar se reenvía lo que el formulario
                // no toca (tipos de paquete y zonas permitidos): si el gateway sustituye en lugar de fusionar, guardar no debe borrarlos
                if (id === null) {
                  await api.create(
                    { ...base, ...(plate ? { licensePlate: plate } : {}), ...(quantity !== 1 ? { quantity } : {}) },
                    { 409: t('Ya existe un vehículo con esa matrícula') }
                  );
                } else {
                  await api.update(
                    id,
                    {
                      ...base,
                      licensePlate: plate || null,
                      quantity,
                      allowedPackageTypes: current?.allowedPackageTypes ?? null,
                      allowedZoneIds: current?.allowedZoneIds ?? null,
                    },
                    { 409: t('Ya existe un vehículo con esa matrícula') }
                  );
                }
                notify(id === null ? t('Vehículo creado') : t('Vehículo guardado'));
                router.push('/fleet/vehicles');
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

type Loaded<T> = { rows: readonly T[]; loaded: boolean; truncated: boolean };

function VehicleFields({
  defaults,
  resolver,
  types,
  places,
  restoreDraft,
  createdTypeId,
  error,
  loading,
  anchorDate,
  onAnchor,
  onCreateType,
  onSubmit,
}: {
  defaults: Values;
  resolver: Resolver<Values>;
  types: Loaded<ResourceType>;
  places: Loaded<Place>;
  restoreDraft: boolean;
  createdTypeId: string | null;
  error: string | null;
  loading: boolean;
  anchorDate: string;
  onAnchor: (date: string) => void;
  onCreateType: (draft: Draft) => void;
  onSubmit: (values: Values, anchorDate: string) => Promise<void>;
}) {
  const t = useT();
  const {
    register,
    handleSubmit,
    getValues,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver, defaultValues: defaults });
  const [leaving, setLeaving] = useState(false);
  useUnsavedWarning(isDirty && !loading && !leaving);

  // Al volver de crear un tipo se recupera el borrador y se deja elegido el tipo nuevo
  useEffect(() => {
    if (!restoreDraft) return;
    const draft = takeDraft<unknown>();
    if (!isDraft(draft)) return;
    const { anchorDate: anchor, ...values } = draft;
    onAnchor(anchor);
    reset({ ...values, ...(createdTypeId ? { resourceTypeId: createdTypeId } : {}) }, { keepDefaultValues: true });
  }, [restoreDraft, createdTypeId, reset, onAnchor]);

  return (
    <Card>
      <Form onSubmit={handleSubmit((values) => onSubmit(values, anchorDate))} className="flex flex-col gap-8">
        <FormSection title={t('Identificación')}>
          <Input label={t('Nombre')} autoComplete="off" error={errors.name?.message} {...register('name')} />
          <Input label={t('Matrícula (opcional)')} autoComplete="off" {...register('licensePlate')} />
          <FormSelect
            control={control}
            name="resourceTypeId"
            label={t('Tipo de vehículo')}
            error={errors.resourceTypeId?.message}
          >
            <option value="" />
            {types.rows.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </FormSelect>
          <div className="flex items-center">
            <Button
              variant="outlined"
              onClick={() => {
                setLeaving(true);
                onCreateType({ ...getValues(), anchorDate });
              }}
            >
              <Icon icon={RiAddLine} size={20} />
              {t('Crear tipo')}
            </Button>
          </div>
          {types.loaded && types.rows.length === 0 ? (
            <p className="text-sm text-on-surface-variant sm:col-span-2">
              {t('Todavía no hay tipos de vehículo. Primero')}{' '}
              <Link href="/fleet/types" className="text-primary underline">
                {t('crea un tipo')}
              </Link>
              .
            </p>
          ) : null}
          {types.truncated ? (
            <p role="status" className="text-sm text-on-surface-variant sm:col-span-2">
              {t('Se muestran solo los primeros {0} tipos.', [SELECT_LIMIT])}
            </p>
          ) : null}
        </FormSection>

        <FormSection title={t('Depósito y turno')}>
          <FormSelect control={control} name="depotId" label={t('Depósito')} error={errors.depotId?.message}>
            <option value="" />
            {places.rows.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </FormSelect>
          {places.loaded && places.rows.length === 0 ? (
            <p className="text-sm text-on-surface-variant sm:col-span-2">
              {t('Todavía no hay lugares que usar como depósito. Primero')}{' '}
              <Link href="/places/new" className="text-primary underline">
                {t('crea un lugar')}
              </Link>
              .
            </p>
          ) : null}
          {places.truncated ? (
            <p role="status" className="text-sm text-on-surface-variant sm:col-span-2">
              {t('Se muestran solo los primeros {0} lugares.', [SELECT_LIMIT])}
            </p>
          ) : null}
          <Input
            label={t('Inicio del turno')}
            type="time"
            hint={t('Hora local de tu navegador')}
            error={errors.shiftStart?.message}
            {...register('shiftStart')}
          />
          <Input
            label={t('Duración del turno (minutos)')}
            type="number"
            step={1}
            autoComplete="off"
            error={errors.shiftDurationMin?.message}
            {...register('shiftDurationMin')}
          />
          <Input
            label={t('Duración del descanso (minutos)')}
            type="number"
            step={1}
            autoComplete="off"
            error={errors.breakDurationMin?.message}
            {...register('breakDurationMin')}
          />
          <Input
            label={t('Cantidad')}
            type="number"
            step={1}
            min={1}
            autoComplete="off"
            error={errors.quantity?.message}
            {...register('quantity')}
          />
        </FormSection>

        <FormResult error={error} />
        <FormActions cancelHref="/fleet/vehicles" loading={loading} dirty={isDirty} />
      </Form>
    </Card>
  );
}
