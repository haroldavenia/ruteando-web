'use client';

import { RiHexagonLine, RiPenNibLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm, useWatch } from 'react-hook-form';

import { PolygonEditor } from '@/components/map/polygon-editor';
import { FormActions, FormCard, FormHead, FormSection, RecordGate } from '@/components/page/form-kit';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { useNotify } from '@/components/ui/toast';
import type { Zone, ZoneInput } from '@/lib/api/models';
import { useRecord } from '@/lib/hooks/use-record';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useZonesApi } from '@/lib/hooks/use-zones-api';
import { useT } from '@/lib/i18n/client';
import type { LatLng } from '@/lib/map/lat-lng';
import {
  isValidPolygon,
  polygonIssueMessage,
  ringFromVertices,
  validatePolygon,
  verticesFromRing,
} from '@/lib/map/polygon-geometry';
import { colorName, ROUTE_COLORS } from '@/lib/map/route-colors';
import { buildZoneUpdateBody, codeError, MAX_CODE_LENGTH } from '@/lib/zones/zone-body';

interface Values {
  name: string;
  code: string;
  color: string | null;
}

/** Formulario de zona (alta y edición): datos, color y el editor del polígono (mapa y tabla de vértices). */
export function ZoneForm({ id, tenantId }: { id: string | null; tenantId: string }) {
  const t = useT();
  const router = useRouter();
  const notify = useNotify();
  const api = useZonesApi(tenantId);
  const record = useRecord<Zone>(id, api.get);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      if (!values.name.trim()) errors.name = { type: 'required', message: t('Este campo es obligatorio') };
      const code = codeError(values.code);
      if (code) {
        const messages = {
          required: t('Este campo es obligatorio'),
          spaces: t('El código no puede llevar espacios'),
          tooLong: t('El código admite como máximo {0} caracteres', [MAX_CODE_LENGTH]),
        };
        errors.code = { type: code, message: messages[code] };
      }
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t]
  );

  return (
    <>
      <FormHead title={id === null ? t('Nueva zona') : t('Editar zona')} backLabel={t('Zonas')} backHref="/zones" />
      <RecordGate state={record} backHref="/zones">
        {(current) => (
          <ZoneFields
            key={current?.id ?? 'new'}
            record={current}
            resolver={resolver}
            error={error}
            loading={loading}
            onSubmit={async (values, vertices) => {
              setLoading(true);
              setError(null);
              const boundary = { type: 'Polygon' as const, coordinates: [ringFromVertices(vertices)] };
              const base: ZoneInput = { name: values.name.trim(), code: values.code.trim(), boundary };
              const duplicate = { 409: t('Ya existe una zona con ese código') };
              try {
                if (id === null || !current) {
                  await api.create(values.color ? { ...base, color: values.color } : base, duplicate);
                } else {
                  await api.update(id, buildZoneUpdateBody(current, { ...base, color: values.color }), duplicate);
                }
                notify(id === null ? t('Zona creada') : t('Zona guardada'));
                router.push('/zones');
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

function ZoneFields({
  record,
  resolver,
  error,
  loading,
  onSubmit,
}: {
  record: Zone | null;
  resolver: Resolver<Values>;
  error: string | null;
  loading: boolean;
  onSubmit: (values: Values, vertices: LatLng[]) => Promise<void>;
}) {
  const t = useT();
  const initial = useMemo(() => verticesFromRing(record?.boundary?.coordinates?.[0]), [record]);
  const [vertices, setVertices] = useState<LatLng[]>(initial);
  const [polygonTouched, setPolygonTouched] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver,
    defaultValues: { name: record?.name ?? '', code: record?.code ?? '', color: record?.color ?? null },
  });
  const color = useWatch({ control, name: 'color' });
  const polygonDirty = JSON.stringify(vertices) !== JSON.stringify(initial);
  useUnsavedWarning((isDirty || polygonDirty) && !loading);

  const polygonError = useMemo(() => {
    if (!polygonTouched) return '';
    if (vertices.length === 0) return t('Dibuja el polígono de la zona en el mapa o escribe sus vértices');
    return validatePolygon(vertices)
      .filter((i) => i.kind !== 'unchecked')
      .map((i) => polygonIssueMessage(i, t))
      .join('. ');
  }, [polygonTouched, vertices, t]);

  const colors = [
    { value: null as string | null, label: t('Sin color') },
    ...ROUTE_COLORS.map((value) => ({ value: value as string | null, label: colorName(value, t) })),
  ];

  return (
    <FormCard className="max-w-none">
      <Form
        onSubmit={(event) => {
          setPolygonTouched(true);
          return handleSubmit((values) => {
            if (vertices.length < 3 || !isValidPolygon(vertices)) return;
            return onSubmit(values, vertices);
          })(event);
        }}
        className="flex flex-col gap-2"
      >
        <FormSection title={t('Datos de la zona')} icon={RiHexagonLine}>
          <Input label={t('Nombre')} autoComplete="off" error={errors.name?.message} {...register('name')} />
          <Input
            label={t('Código')}
            autoComplete="off"
            hint={t('Sin espacios, hasta 20 caracteres')}
            error={errors.code?.message}
            {...register('code')}
          />
          <fieldset className="m-0 mb-2 flex flex-wrap gap-2 rounded-control border border-outline-variant px-3 pt-2 pb-3 md:col-span-2">
            <legend className="px-1 text-sm font-medium">{t('Color')}</legend>
            {colors.map((option) => {
              const on = color === option.value;
              return (
                <label
                  key={option.label}
                  className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-[15px] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${on ? 'border-primary bg-secondary-container' : 'border-outline-variant'}`}
                >
                  <input
                    type="radio"
                    name="zone-color"
                    value={option.value ?? ''}
                    checked={on}
                    onChange={() => setValue('color', option.value, { shouldDirty: true })}
                    className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                  />
                  <span
                    aria-hidden="true"
                    className={`size-[18px] rounded-[5px] border border-outline ${option.value === null ? 'border-dashed' : ''}`}
                    style={{ background: option.value ?? 'transparent' }}
                  />
                  {option.label}
                </label>
              );
            })}
          </fieldset>
        </FormSection>

        <FormSection title={t('Polígono')} icon={RiPenNibLine}>
          <PolygonEditor vertices={vertices} onChange={setVertices} color={color} />
          {polygonError ? (
            <p role="alert" className="m-0 text-error md:col-span-2">
              {polygonError}
            </p>
          ) : null}
        </FormSection>

        <FormResult error={error} />
        <FormActions cancelHref="/zones" loading={loading} dirty={isDirty || polygonDirty} />
      </Form>
    </FormCard>
  );
}
