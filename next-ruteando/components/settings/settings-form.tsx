'use client';

import { RiEqualizerLine, RiMapPin2Line, RiRouteLine, RiTimerLine } from '@remixicon/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm, useWatch } from 'react-hook-form';

import { FormActions, FormCard, FormHead, FormSection, RecordGate } from '@/components/page/form-kit';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { FormSelect } from '@/components/ui/form-select';
import { Switch } from '@/components/ui/switch';
import { useNotify } from '@/components/ui/toast';
import type { Place, Settings, SettingsInput } from '@/lib/api/models';
import { useCrud } from '@/lib/hooks/use-crud';
import { useMasterDomain } from '@/lib/hooks/use-master-domain';
import { useRecord } from '@/lib/hooks/use-record';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useT } from '@/lib/i18n/client';
import {
  DEFAULT_LENGTH_OF_STAY_TYPES,
  DEFAULT_RESTRICTION_TYPES,
  DEFAULT_ROUTE_TOPOLOGIES,
  describeSettings,
  FIXED_ROUTES,
  FIXED_STAY,
  lengthOfStayLabel,
  restrictionTypeLabel,
  routeTopologyLabel,
} from '@/lib/settings/labels';
import { buildSettingsUpdateBody } from '@/lib/settings/settings-body';
import { formatDuration, parseDuration } from '@/lib/time/duration';
import {
  fromUtcIso,
  localDateOf,
  minutesToSeconds,
  secondsToMinutes,
  shiftErrors,
  todayLocalDate,
  toUtcIso,
} from '@/lib/time/shift-time';

/** Cuántos lugares se cargan en el selector; si hay más, el formulario avisa. */
export const SELECT_LIMIT = 200;
const NO_STAY = '';

interface Values {
  description: string;
  routeTopology: string;
  restrictionType: string;
  placeStartId: string;
  placeEndId: string;
  evaluateWeight: boolean;
  evaluateVolume: boolean;
  evaluateItineraryZone: boolean;
  fixedRoutes: string;
  shiftStart: string;
  shiftDurationMin: string;
  breakDurationMin: string;
  typeLengthOfStay: string;
  lengthOfStay: string;
}

const EMPTY: Values = {
  description: '',
  routeTopology: '',
  restrictionType: '',
  placeStartId: '',
  placeEndId: '',
  evaluateWeight: false,
  evaluateVolume: false,
  evaluateItineraryZone: false,
  fixedRoutes: '',
  shiftStart: '08:00',
  shiftDurationMin: '8h',
  breakDurationMin: '1h',
  typeLengthOfStay: NO_STAY,
  lengthOfStay: '',
};

/**
 * Formulario de configuración de planificación. Según el tipo de restricción se ven unas secciones u otras (con rutas fijas no hay turno
 * ni peso ni volumen) y las que no aplican ni se validan ni se envían. Estancia, turno y descanso se escriben como `1h 30m`.
 */
export function SettingsForm({ id }: { id: string | null }) {
  const t = useT();
  const router = useRouter();
  const notify = useNotify();
  const api = useCrud<Settings, SettingsInput>('settings');
  const placesApi = useCrud<Place, never>('places');
  const record = useRecord<Settings>(id, api.get);
  const [places, setPlaces] = useState<{ rows: readonly Place[]; loaded: boolean; truncated: boolean }>({
    rows: [],
    loaded: false,
    truncated: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let current = true;
    placesApi.list(0, SELECT_LIMIT).then(
      (page) =>
        current && setPlaces({ rows: page.content, loaded: true, truncated: page.totalElements > page.content.length }),
      () => current && setPlaces((s) => ({ ...s, loaded: true }))
    );
    return () => {
      current = false;
    };
  }, [placesApi]);

  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      const required = t('Este campo es obligatorio');
      const duration = t('Usa el formato 2h 45m (h = horas, m = minutos)');
      for (const field of ['description', 'routeTopology', 'restrictionType', 'placeStartId'] as const) {
        if (!values[field].trim()) errors[field] = { type: 'required', message: required };
      }
      const fixed = values.restrictionType === FIXED_ROUTES;
      if (fixed) {
        const routes = Number(values.fixedRoutes);
        if (values.fixedRoutes.trim() === '') errors.fixedRoutes = { type: 'required', message: required };
        else if (!Number.isInteger(routes) || routes < 1) {
          errors.fixedRoutes = { type: 'whole', message: t('Escribe un número entero de 1 o más') };
        }
      } else if (values.restrictionType !== '') {
        if (!values.shiftStart) errors.shiftStart = { type: 'required', message: required };
        const shift = parseDuration(values.shiftDurationMin);
        if (!values.shiftDurationMin.trim()) errors.shiftDurationMin = { type: 'required', message: required };
        else if (shift === null) errors.shiftDurationMin = { type: 'duration', message: duration };
        else {
          const found = shiftErrors(shift, 0)[0];
          if (found === 'shiftNotPositive')
            errors.shiftDurationMin = { type: found, message: t('La duración debe ser mayor que 0') };
          if (found === 'shiftTooLong') {
            errors.shiftDurationMin = {
              type: found,
              message: t('El turno no puede durar más de 24 horas (1440 minutos)'),
            };
          }
        }
        // El descanso puede ser 0m: solo se exige que siga el formato
        if (!values.breakDurationMin.trim()) errors.breakDurationMin = { type: 'required', message: required };
        else if (parseDuration(values.breakDurationMin) === null) {
          errors.breakDurationMin = { type: 'duration', message: duration };
        }
      }
      if (values.typeLengthOfStay === FIXED_STAY) {
        const stay = parseDuration(values.lengthOfStay);
        if (!values.lengthOfStay.trim()) errors.lengthOfStay = { type: 'required', message: required };
        else if (stay === null) errors.lengthOfStay = { type: 'duration', message: duration };
        else if (stay <= 0) errors.lengthOfStay = { type: 'positive', message: t('Escribe un valor mayor que 0') };
      }
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t]
  );

  const defaults = useMemo<Values>(() => {
    if (record.status !== 'ready') return EMPTY;
    const r = record.record;
    return {
      description: r.description,
      routeTopology: r.routeTopology,
      restrictionType: r.restrictionType,
      placeStartId: r.placeStartId,
      placeEndId: r.placeEndId && r.placeEndId !== r.placeStartId ? r.placeEndId : '',
      evaluateWeight: r.evaluateWeight,
      evaluateVolume: r.evaluateVolume,
      evaluateItineraryZone: r.evaluateItineraryZone,
      fixedRoutes: r.fixedRoutes === null ? '' : String(r.fixedRoutes),
      shiftStart: r.shiftStartUtc ? fromUtcIso(r.shiftStartUtc) : '08:00',
      shiftDurationMin: r.shiftDurationSec === null ? '8h' : formatDuration(secondsToMinutes(r.shiftDurationSec)),
      breakDurationMin: r.breakDurationSec === null ? '1h' : formatDuration(secondsToMinutes(r.breakDurationSec)),
      typeLengthOfStay: r.typeLengthOfStay ?? NO_STAY,
      lengthOfStay: r.lengthOfStay === null ? '' : formatDuration(r.lengthOfStay),
    };
  }, [record]);

  const topologies = useOptions('RouteTopology', DEFAULT_ROUTE_TOPOLOGIES, routeTopologyLabel);
  const restrictions = useOptions('RestrictionType', DEFAULT_RESTRICTION_TYPES, restrictionTypeLabel);
  const stayTypes = useOptions('TypeLengthOfStay', DEFAULT_LENGTH_OF_STAY_TYPES, lengthOfStayLabel);

  return (
    <>
      <FormHead
        title={id === null ? t('Nueva configuración') : t('Editar configuración')}
        backLabel={t('Configuraciones')}
        backHref="/settings"
      />
      <RecordGate state={record} backHref="/settings">
        {(current) => (
          <SettingsFields
            key={current?.id ?? 'new'}
            defaults={defaults}
            resolver={resolver}
            places={places}
            topologies={topologies}
            restrictions={restrictions}
            stayTypes={stayTypes}
            error={error}
            loading={loading}
            onSubmit={async (value) => {
              setLoading(true);
              setError(null);
              const fixed = value.restrictionType === FIXED_ROUTES;
              const stayFixed = value.typeLengthOfStay === FIXED_STAY;
              const hasStayType = value.typeLengthOfStay !== NO_STAY;
              const stayMinutes = parseDuration(value.lengthOfStay);
              // La hora del turno se ancla a la fecha local de la configuración (la de hoy al crear)
              const anchor = current?.shiftStartUtc ? localDateOf(current.shiftStartUtc) : todayLocalDate();
              const required: SettingsInput = {
                description: value.description.trim(),
                routeTopology: value.routeTopology,
                restrictionType: value.restrictionType,
                placeStartId: value.placeStartId,
              };
              const shift = {
                shiftStartUtc: toUtcIso(value.shiftStart, anchor),
                shiftDurationSec: minutesToSeconds(parseDuration(value.shiftDurationMin) as number),
                breakDurationSec: minutesToSeconds(parseDuration(value.breakDurationMin) as number),
              };
              try {
                if (id === null || !current) {
                  // En el alta solo se envía lo que aplica y lo que se aparta del valor por defecto
                  await api.create({
                    ...required,
                    ...(value.placeEndId ? { placeEndId: value.placeEndId } : {}),
                    ...(fixed ? { fixedRoutes: Number(value.fixedRoutes) } : shift),
                    ...(!fixed && value.evaluateWeight ? { evaluateWeight: true } : {}),
                    ...(!fixed && value.evaluateVolume ? { evaluateVolume: true } : {}),
                    ...(value.evaluateItineraryZone ? { evaluateItineraryZone: true } : {}),
                    ...(hasStayType
                      ? {
                          typeLengthOfStay: value.typeLengthOfStay,
                          ...(stayFixed ? { lengthOfStay: stayMinutes } : {}),
                        }
                      : {}),
                  });
                } else {
                  await api.update(
                    id,
                    buildSettingsUpdateBody(current, {
                      ...required,
                      placeEndId: value.placeEndId || value.placeStartId,
                      evaluateWeight: !fixed && value.evaluateWeight,
                      evaluateVolume: !fixed && value.evaluateVolume,
                      evaluateItineraryZone: value.evaluateItineraryZone,
                      // Las secciones que no aplican se envían como null para no dejar valores obsoletos
                      fixedRoutes: fixed ? Number(value.fixedRoutes) : null,
                      shiftStartUtc: fixed ? null : shift.shiftStartUtc,
                      shiftDurationSec: fixed ? null : shift.shiftDurationSec,
                      breakDurationSec: fixed ? null : shift.breakDurationSec,
                      typeLengthOfStay: hasStayType ? value.typeLengthOfStay : null,
                      lengthOfStay: stayFixed ? stayMinutes : null,
                    })
                  );
                }
                notify(id === null ? t('Configuración creada') : t('Configuración guardada'));
                router.push('/settings');
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

/** Opciones de un dominio del gateway (o las habituales mientras no cargue) con su etiqueta. */
function useOptions(
  domain: string,
  defaults: string[],
  labelOf: (key: string | null, t: ReturnType<typeof useT>) => string
) {
  const t = useT();
  const values = useMasterDomain(domain).all;
  return (values.length ? values.map((v) => v.key) : defaults).map((key) => ({ key, label: labelOf(key, t) }));
}

type Option = { key: string; label: string };

function SettingsFields({
  defaults,
  resolver,
  places,
  topologies,
  restrictions,
  stayTypes,
  error,
  loading,
  onSubmit,
}: {
  defaults: Values;
  resolver: Resolver<Values>;
  places: { rows: readonly Place[]; loaded: boolean; truncated: boolean };
  topologies: Option[];
  restrictions: Option[];
  stayTypes: Option[];
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
  const value = useWatch({ control }) as Values;
  const fixed = value.restrictionType === FIXED_ROUTES;
  const showShift = value.restrictionType !== '' && !fixed;
  const placeName = (id: string) => places.rows.find((p) => p.id === id)?.name ?? null;

  /** La configuración que se está escribiendo, en una frase: solo da formato a lo que hay en el formulario. */
  const summary = describeSettings(
    {
      restrictionType: value.restrictionType ?? '',
      routeTopology: value.routeTopology ?? '',
      fixedRoutes: value.fixedRoutes ? Number(value.fixedRoutes) : null,
      shiftDurationMin: parseDuration(value.shiftDurationMin ?? ''),
      placeStartName: value.placeStartId ? placeName(value.placeStartId) : null,
      placeEndName: value.placeEndId ? placeName(value.placeEndId) : null,
      vehicleCount: 0,
      evaluateWeight: !fixed && !!value.evaluateWeight,
      evaluateVolume: !fixed && !!value.evaluateVolume,
      evaluateItineraryZone: !!value.evaluateItineraryZone,
    },
    t
  );
  const toggle = (name: 'evaluateWeight' | 'evaluateVolume' | 'evaluateItineraryZone', on: boolean) =>
    setValue(name, on, { shouldDirty: true });

  const hint = t('Usa este formato: 2h 45m (h = horas, m = minutos)');
  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormCard>
        <FormSection title={t('Ruta')} icon={RiRouteLine}>
          <Input
            label={t('Descripción')}
            requiredMark
            autoComplete="off"
            error={errors.description?.message}
            {...register('description')}
          />
          <FormSelect
            control={control}
            name="restrictionType"
            label={t('Tipo de restricción')}
            requiredMark
            error={errors.restrictionType?.message}
          >
            <option value="" />
            {restrictions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </FormSelect>
          {fixed ? (
            <Input
              label={t('Número de rutas')}
              requiredMark
              type="number"
              step={1}
              min={1}
              autoComplete="off"
              error={errors.fixedRoutes?.message}
              {...register('fixedRoutes')}
            />
          ) : null}
          {showShift ? (
            <>
              <Input
                label={t('Inicio del turno')}
                requiredMark
                type="time"
                hint={t('Hora local de tu navegador')}
                error={errors.shiftStart?.message}
                {...register('shiftStart')}
              />
              <Input
                label={t('Duración del turno')}
                requiredMark
                autoComplete="off"
                hint={hint}
                error={errors.shiftDurationMin?.message}
                {...register('shiftDurationMin')}
              />
              <Input
                label={t('Descanso')}
                requiredMark
                autoComplete="off"
                hint={hint}
                error={errors.breakDurationMin?.message}
                {...register('breakDurationMin')}
              />
            </>
          ) : null}
        </FormSection>

        <FormSection title={t('Lugares')} icon={RiMapPin2Line}>
          <FormSelect
            control={control}
            name="routeTopology"
            label={t('Topología de la ruta')}
            requiredMark
            error={errors.routeTopology?.message}
          >
            <option value="" />
            {topologies.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            control={control}
            name="placeStartId"
            label={t('Lugar de salida')}
            requiredMark
            error={errors.placeStartId?.message}
          >
            <option value="" />
            {places.rows.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </FormSelect>
          <FormSelect control={control} name="placeEndId" label={t('Lugar de llegada (opcional)')}>
            <option value="">{t('Igual que la salida')}</option>
            {places.rows.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </FormSelect>
          {places.loaded && places.rows.length === 0 ? (
            <p className="text-sm text-on-surface-variant md:col-span-2">
              {t('Todavía no hay lugares. Primero')}{' '}
              <Link href="/places/new" className="text-primary underline">
                {t('crea un lugar')}
              </Link>
              .
            </p>
          ) : null}
          {places.truncated ? (
            <p role="status" className="text-sm text-on-surface-variant md:col-span-2">
              {t('Se muestran solo los primeros {0} lugares.', [SELECT_LIMIT])}
            </p>
          ) : null}
        </FormSection>

        <aside
          aria-labelledby="summary-title"
          className="my-1 rounded-card border border-outline-variant bg-surface-container-low px-6 py-5 text-on-surface shadow-card"
        >
          <h2 id="summary-title" className="m-0 mb-3 font-brand text-[22px]/7 font-bold">
            {t('Así quedará')}
          </h2>
          <p className="m-0 font-brand text-base/[1.45] font-bold">{summary}</p>
        </aside>

        <FormSection title={t('Qué evalúa la planificación')} icon={RiEqualizerLine}>
          <div
            role="group"
            aria-label={t('Qué evalúa la planificación')}
            className="grid grid-cols-[repeat(auto-fit,minmax(min(14rem,100%),1fr))] gap-x-4 gap-y-2 md:col-span-2"
          >
            {!fixed ? (
              <Switch
                checked={!!value.evaluateWeight}
                onChange={(on) => toggle('evaluateWeight', on)}
                label={t('Evaluar peso')}
              />
            ) : null}
            {!fixed ? (
              <Switch
                checked={!!value.evaluateVolume}
                onChange={(on) => toggle('evaluateVolume', on)}
                label={t('Evaluar volumen')}
              />
            ) : null}
            <Switch
              checked={!!value.evaluateItineraryZone}
              onChange={(on) => toggle('evaluateItineraryZone', on)}
              label={t('Evaluar zona del itinerario')}
            />
          </div>
        </FormSection>

        <FormSection title={t('Estancia en cada parada')} icon={RiTimerLine}>
          <FormSelect control={control} name="typeLengthOfStay" label={t('Estancia en cada parada (opcional)')}>
            <option value="">{t('Sin definir')}</option>
            {stayTypes.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </FormSelect>
          {value.typeLengthOfStay === FIXED_STAY ? (
            <Input
              label={t('Estancia')}
              requiredMark
              autoComplete="off"
              hint={hint}
              error={errors.lengthOfStay?.message}
              {...register('lengthOfStay')}
            />
          ) : null}
        </FormSection>

        <FormResult error={error} />
        <FormActions cancelHref="/settings" loading={loading} dirty={isDirty} />
      </FormCard>
    </Form>
  );
}
