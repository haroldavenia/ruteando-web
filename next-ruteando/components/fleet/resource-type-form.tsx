'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm, useWatch } from 'react-hook-form';

import { FormActions, FormHead, FormSection, RecordGate } from '@/components/page/form-kit';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { FormSelect } from '@/components/ui/form-select';
import { useNotify } from '@/components/ui/toast';
import type { ResourceType, ResourceTypeInput } from '@/lib/api/models';
import {
  type CapacityMode,
  type CapacityValues,
  CM3_PER_M3,
  decodeCapacity,
  encodeCapacity,
  volumeOfMeasures,
} from '@/lib/fleet/capacity-codec';
import { type CapacityField, capacityIssues } from '@/lib/fleet/capacity-rules';
import { profileLabel, RESOURCE_CATEGORIES } from '@/lib/fleet/labels';
import { withCreatedType } from '@/lib/fleet/type-handoff';
import { useCrud } from '@/lib/hooks/use-crud';
import { useMasterDomain } from '@/lib/hooks/use-master-domain';
import { useRecord } from '@/lib/hooks/use-record';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useLang, useT } from '@/lib/i18n/client';

interface Values {
  name: string;
  category: string;
  osrmProfile: string;
  gasMileage: string;
  mode: CapacityMode;
  weight: string;
  volume: string;
  width: string;
  height: string;
  depth: string;
  minWeight: string;
  maxWeight: string;
  minVolume: string;
  maxVolume: string;
}

const text = (n: number | null) => (n === null ? '' : String(n));
const num = (s: string): number | null => {
  const trimmed = s.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

/** Los valores de capacidad del formulario en kg, cm³ y cm (`null` es «sin dato»). */
function capacityOf(v: Values): CapacityValues {
  const n = (s: string) => {
    const x = num(s);
    return x === null || Number.isNaN(x) ? null : x;
  };
  return {
    mode: v.mode,
    weight: n(v.weight),
    volume: n(v.volume),
    width: n(v.width),
    height: n(v.height),
    depth: n(v.depth),
    minWeight: n(v.minWeight),
    maxWeight: n(v.maxWeight),
    minVolume: n(v.minVolume),
    maxVolume: n(v.maxVolume),
  };
}

const EMPTY: Values = {
  name: '',
  category: '',
  osrmProfile: 'driving',
  gasMileage: '',
  mode: 'volume',
  weight: '',
  volume: '',
  width: '',
  height: '',
  depth: '',
  minWeight: '',
  maxWeight: '',
  minVolume: '',
  maxVolume: '',
};

/** Formulario de tipo de vehículo (alta y edición). `returnTo` es a dónde volver si se llegó desde el formulario de vehículo. */
export function ResourceTypeForm({ id, returnTo }: { id: string | null; returnTo: string | null }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const notify = useNotify();
  const api = useCrud<ResourceType, ResourceTypeInput>('resource-types');
  const profiles = useMasterDomain('OsrmProfile').active;
  const record = useRecord<ResourceType>(id, api.get);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const back = returnTo ?? '/fleet/types';

  const defaults = useMemo<Values>(() => {
    if (record.status !== 'ready') return EMPTY;
    const r = record.record;
    const c = decodeCapacity(r);
    return {
      name: r.name,
      category: r.category,
      osrmProfile: r.osrmProfile,
      gasMileage: text(r.gasMileage),
      mode: c.mode,
      weight: text(c.weight),
      volume: text(c.volume),
      width: text(c.width),
      height: text(c.height),
      depth: text(c.depth),
      minWeight: text(c.minWeight),
      maxWeight: text(c.maxWeight),
      minVolume: text(c.minVolume),
      maxVolume: text(c.maxVolume),
    };
  }, [record]);

  // Se valida a mano: los campos de capacidad dependen unos de otros (mínimo ≤ máximo ≤ capacidad)
  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      const required = t('Este campo es obligatorio');
      if (!values.name.trim()) errors.name = { type: 'required', message: required };
      if (!values.category.trim()) errors.category = { type: 'required', message: required };
      if (!values.osrmProfile) errors.osrmProfile = { type: 'required', message: required };
      const gas = num(values.gasMileage);
      if (gas !== null && (Number.isNaN(gas) || gas < 0)) {
        errors.gasMileage = { type: 'min', message: t('No puede ser negativo') };
      }
      // Solo se exige la capacidad cuando la persona la tocó: un tipo que ya traía una incompleta se puede renombrar sin más
      const touched = JSON.stringify(capacityOf(values)) !== JSON.stringify(capacityOf(defaults));
      if (touched) {
        for (const [field, message] of Object.entries(capacityIssues(capacityOf(values), t))) {
          errors[field as CapacityField] = { type: 'capacity', message };
        }
      }
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t, defaults]
  );

  return (
    <>
      <FormHead
        title={id === null ? t('Nuevo tipo de vehículo') : t('Editar tipo de vehículo')}
        backLabel={returnTo ? t('Volver') : t('Tipos de vehículo')}
        backHref={back}
      />
      <RecordGate state={record} backHref="/fleet/types">
        {(current) => (
          <TypeFields
            key={current?.id ?? 'new'}
            defaults={defaults}
            resolver={resolver}
            profiles={profiles.map((p) => ({ key: p.key, label: profileLabel(p.key, t) }))}
            lang={lang}
            cancelHref={back}
            error={error}
            loading={loading}
            onSubmit={async (values) => {
              setLoading(true);
              setError(null);
              try {
                const base: ResourceTypeInput = {
                  name: values.name.trim(),
                  category: values.category.trim(),
                  osrmProfile: values.osrmProfile,
                };
                // La capacidad se fusiona con lo que trajo el gateway: las claves que la pantalla no conoce se conservan
                const encoded = encodeCapacity(capacityOf(values), current);
                const gas = num(values.gasMileage);
                const saved =
                  id === null
                    ? await api.create({
                        ...base,
                        ...(gas === null ? {} : { gasMileage: gas }),
                        ...(encoded.capacity ? { capacity: encoded.capacity } : {}),
                        ...(encoded.measure ? { measure: encoded.measure } : {}),
                        ...(encoded.restriction ? { restriction: encoded.restriction } : {}),
                      })
                    : await api.update(id, { ...base, gasMileage: gas, ...encoded });
                notify(id === null ? t('Tipo de vehículo creado') : t('Tipo de vehículo guardado'));
                router.push(returnTo ? withCreatedType(returnTo, saved.id) : '/fleet/types');
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

function TypeFields({
  defaults,
  resolver,
  profiles,
  lang,
  cancelHref,
  error,
  loading,
  onSubmit,
}: {
  defaults: Values;
  resolver: Resolver<Values>;
  profiles: { key: string; label: string }[];
  lang: string;
  cancelHref: string;
  error: string | null;
  loading: boolean;
  onSubmit: (values: Values) => Promise<void>;
}) {
  const t = useT();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver, defaultValues: defaults });
  useUnsavedWarning(isDirty && !loading);
  const values = useWatch({ control });
  const measured = values.mode === 'measure';
  const volume = volumeOfMeasures(capacityOf({ ...EMPTY, ...values } as Values));
  const number = useMemo(() => new Intl.NumberFormat(lang, { maximumFractionDigits: 2, useGrouping: false }), [lang]);
  const field = useCallback(
    (name: CapacityField, label: string, unit: string) => (
      <Input
        label={`${label} (${unit})`}
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        autoComplete="off"
        error={errors[name]?.message}
        {...register(name)}
      />
    ),
    [errors, register]
  );
  const categories = useMemo(() => [...RESOURCE_CATEGORIES], []);

  return (
    <Card>
      <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <FormSection title={t('Datos del tipo')}>
          <Input label={t('Nombre')} autoComplete="off" error={errors.name?.message} {...register('name')} />
          <Input
            label={t('Categoría')}
            autoComplete="off"
            list="resource-categories"
            error={errors.category?.message}
            {...register('category')}
          />
          <datalist id="resource-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <FormSelect
            control={control}
            name="osrmProfile"
            label={t('Perfil de ruteo')}
            error={errors.osrmProfile?.message}
          >
            {profiles.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </FormSelect>
          <Input
            label={t('Consumo (opcional)')}
            type="number"
            min={0}
            step="any"
            autoComplete="off"
            error={errors.gasMileage?.message}
            {...register('gasMileage')}
          />
        </FormSection>

        <FormSection title={t('Capacidad')}>
          <p className="text-sm text-on-surface-variant sm:col-span-2">
            {t('Opcional. La planificación la usa cuando su configuración evalúa el peso y el volumen.')}
          </p>
          {field('weight', t('Peso que carga'), t('kg'))}
          <Select label={t('Capacidad en')} {...register('mode')}>
            <option value="volume">{t('En volumen')}</option>
            <option value="measure">{t('En medidas')}</option>
          </Select>
          {measured ? (
            <>
              {field('width', t('Ancho'), t('cm'))}
              {field('height', t('Alto'), t('cm'))}
              {field('depth', t('Profundidad'), t('cm'))}
              <p role="status" className="self-center text-sm text-on-surface-variant">
                {t('Volumen calculado:')}{' '}
                {volume === null ? (
                  <span>{t('completa las tres medidas')}</span>
                ) : (
                  <strong className="text-on-surface">
                    {t('{0} cm³ · {1} m³', [number.format(volume), number.format(volume / CM3_PER_M3)])}
                  </strong>
                )}
              </p>
            </>
          ) : (
            field('volume', t('Volumen'), t('cm³'))
          )}
        </FormSection>

        <FormSection title={t('Restricciones de carga')}>
          <p className="text-sm text-on-surface-variant sm:col-span-2">
            {t('Opcional. Límites de carga que respeta el vehículo; no pueden superar su capacidad.')}
          </p>
          {field('minWeight', t('Peso mínimo'), t('kg'))}
          {field('maxWeight', t('Peso máximo'), t('kg'))}
          {field('minVolume', t('Volumen mínimo'), t('cm³'))}
          {field('maxVolume', t('Volumen máximo'), t('cm³'))}
        </FormSection>

        <FormResult error={error} />
        <FormActions cancelHref={cancelHref} loading={loading} dirty={isDirty} />
      </Form>
    </Card>
  );
}
