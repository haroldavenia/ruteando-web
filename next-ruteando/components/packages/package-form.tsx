'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm, useWatch } from 'react-hook-form';

import { AddressLocator } from '@/components/map/address-locator';
import { LocationFields } from '@/components/map/location-fields';
import { FormActions, FormHead, FormSection, RecordGate } from '@/components/page/form-kit';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { FormSelect } from '@/components/ui/form-select';
import { useNotify } from '@/components/ui/toast';
import type { Package, PackageInput } from '@/lib/api/models';
import { useCrud } from '@/lib/hooks/use-crud';
import { useMasterDomain } from '@/lib/hooks/use-master-domain';
import { useRecord } from '@/lib/hooks/use-record';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useT } from '@/lib/i18n/client';
import { fromGeoJsonPoint, toGeoJsonPoint } from '@/lib/map/lat-lng';
import { locationErrors, parseCoordinate } from '@/lib/map/location-input';
import { SERVICE_TYPE_KEYS, serviceTypeLabel } from '@/lib/packages/labels';
import { buildUpdateBody } from '@/lib/packages/package-body';

interface Values {
  guideNumber: string;
  name: string;
  serviceType: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  lat: string;
  lng: string;
  weight: string;
  volume: string;
  pieceNumber: string;
  observation: string;
}

const EMPTY: Values = {
  guideNumber: '',
  name: '',
  serviceType: '',
  address: '',
  city: '',
  country: '',
  postalCode: '',
  lat: '',
  lng: '',
  weight: '',
  volume: '',
  pieceNumber: '1',
  observation: '',
};

/** Formulario de paquete (alta y edición). */
export function PackageForm({ id }: { id: string | null }) {
  const t = useT();
  const router = useRouter();
  const notify = useNotify();
  const api = useCrud<Package, PackageInput>('packages');
  const record = useRecord<Package>(id, api.get);
  const masters = useMasterDomain('ServiceType').all;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      const required = t('Este campo es obligatorio');
      for (const field of ['name', 'serviceType', 'address'] as const) {
        if (!values[field].trim()) errors[field] = { type: 'required', message: required };
      }
      for (const field of ['weight', 'volume'] as const) {
        const value = parseCoordinate(values[field]);
        if (values[field].trim() === '') errors[field] = { type: 'required', message: required };
        else if (value === null || value < 0)
          errors[field] = { type: 'min', message: t('El valor no puede ser negativo') };
      }
      const pieces = Number(values.pieceNumber);
      if (values.pieceNumber.trim() === '') errors.pieceNumber = { type: 'required', message: required };
      else if (!Number.isInteger(pieces) || pieces < 1) {
        errors.pieceNumber = { type: 'pieces', message: t('Escribe un número entero de 1 o más') };
      }
      const place = locationErrors(values.lat, values.lng, t);
      if (place.lat) errors.lat = { type: 'location', message: place.lat };
      if (place.lng) errors.lng = { type: 'location', message: place.lng };
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t]
  );

  const defaults = useMemo<Values>(() => {
    if (record.status !== 'ready') return EMPTY;
    const p = record.record;
    const point = fromGeoJsonPoint(p.location?.coordinates);
    return {
      guideNumber: p.guideNumber ?? '',
      name: p.name,
      serviceType: p.serviceType,
      address: p.address,
      city: p.city ?? '',
      country: p.country ?? '',
      postalCode: p.postalCode ?? '',
      lat: point ? String(point.lat) : '',
      lng: point ? String(point.lng) : '',
      weight: String(p.weight),
      volume: String(p.volume),
      pieceNumber: String(p.pieceNumber),
      observation: p.observation ?? '',
    };
  }, [record]);

  const keys = masters.length > 0 ? masters.map((m) => m.key) : [...SERVICE_TYPE_KEYS];
  const stored = record.status === 'ready' ? record.record.serviceType : '';
  const types = (stored && !keys.includes(stored) ? [...keys, stored] : keys).map((key) => ({
    key,
    label: serviceTypeLabel(key, t),
  }));

  return (
    <>
      <FormHead
        title={id === null ? t('Nuevo paquete') : t('Editar paquete')}
        backLabel={t('Paquetes')}
        backHref="/packages"
      />
      <RecordGate state={record} backHref="/packages">
        {(current) => (
          <PackageFields
            key={current?.id ?? 'new'}
            defaults={defaults}
            resolver={resolver}
            types={types}
            error={error}
            loading={loading}
            onSubmit={async (values) => {
              setLoading(true);
              setError(null);
              const location = toGeoJsonPoint({
                lat: parseCoordinate(values.lat) as number,
                lng: parseCoordinate(values.lng) as number,
              });
              if (!location) {
                setLoading(false);
                return;
              }
              const text = (s: string) => s.trim();
              const required: PackageInput = {
                name: text(values.name),
                serviceType: values.serviceType,
                address: text(values.address),
                location,
                weight: Number(values.weight),
                volume: Number(values.volume),
              };
              const optional = {
                guideNumber: text(values.guideNumber),
                city: text(values.city),
                country: text(values.country),
                postalCode: text(values.postalCode),
                observation: text(values.observation),
              };
              const pieces = Number(values.pieceNumber);
              const duplicate = { 409: t('Ya existe un paquete con ese número de guía') };
              try {
                if (id === null || !current) {
                  // En el alta solo se envía lo que tiene valor: una guía vacía repetida daría 409 en el gateway
                  await api.create(
                    {
                      ...required,
                      ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== '')),
                      ...(pieces !== 1 ? { pieceNumber: pieces } : {}),
                    },
                    duplicate
                  );
                } else {
                  await api.update(
                    id,
                    buildUpdateBody(current, {
                      ...required,
                      pieceNumber: pieces,
                      guideNumber: optional.guideNumber || null,
                      city: optional.city || null,
                      country: optional.country || null,
                      postalCode: optional.postalCode || null,
                      observation: optional.observation || null,
                    }),
                    duplicate
                  );
                }
                notify(id === null ? t('Paquete creado') : t('Paquete guardado'));
                router.push('/packages');
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

function PackageFields({
  defaults,
  resolver,
  types,
  error,
  loading,
  onSubmit,
}: {
  defaults: Values;
  resolver: Resolver<Values>;
  types: { key: string; label: string }[];
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
  const [lat, lng, address, city, country] = useWatch({ control, name: ['lat', 'lng', 'address', 'city', 'country'] });
  const dirty = { shouldDirty: true, shouldValidate: true } as const;
  const setPoint = (point: { lat: number; lng: number }) => {
    setValue('lat', String(point.lat), dirty);
    setValue('lng', String(point.lng), dirty);
  };

  return (
    <Card>
      <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <FormSection title={t('Identificación')}>
          <Input
            label={t('Número de guía (opcional)')}
            hint={t('Único en tu empresa')}
            autoComplete="off"
            {...register('guideNumber')}
          />
          <Input label={t('Nombre')} autoComplete="off" error={errors.name?.message} {...register('name')} />
          <FormSelect
            control={control}
            name="serviceType"
            label={t('Tipo de servicio')}
            error={errors.serviceType?.message}
          >
            <option value="" />
            {types.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </FormSelect>
        </FormSection>

        <FormSection title={t('Dirección')}>
          <Input
            label={t('Dirección')}
            autoComplete="off"
            className="sm:col-span-2"
            error={errors.address?.message}
            {...register('address')}
          />
          <Input label={t('Ciudad (opcional)')} autoComplete="off" {...register('city')} />
          <Input label={t('País (opcional)')} autoComplete="off" {...register('country')} />
          <Input label={t('Código postal (opcional)')} autoComplete="off" {...register('postalCode')} />
        </FormSection>

        <FormSection title={t('Carga')}>
          <Input
            label={t('Peso')}
            type="number"
            step="any"
            min={0}
            autoComplete="off"
            error={errors.weight?.message}
            {...register('weight')}
          />
          <Input
            label={t('Volumen')}
            type="number"
            step="any"
            min={0}
            autoComplete="off"
            error={errors.volume?.message}
            {...register('volume')}
          />
          <Input
            label={t('Número de piezas')}
            type="number"
            step={1}
            min={1}
            autoComplete="off"
            error={errors.pieceNumber?.message}
            {...register('pieceNumber')}
          />
          <Textarea
            label={t('Observación (opcional)')}
            rows={2}
            className="sm:col-span-2"
            {...register('observation')}
          />
        </FormSection>

        <FormSection title={t('Ubicación')}>
          <AddressLocator
            address={address ?? ''}
            city={city}
            country={country}
            lat={lat}
            lng={lng}
            setAddress={(value) => setValue('address', value, dirty)}
            setCity={(value) => setValue('city', value, dirty)}
            setCountry={(value) => setValue('country', value, dirty)}
            setPoint={setPoint}
          />
          <LocationFields
            latProps={register('lat')}
            lngProps={register('lng')}
            lat={lat}
            lng={lng}
            latError={errors.lat?.message}
            lngError={errors.lng?.message}
            onPick={setPoint}
          />
        </FormSection>

        <FormResult error={error} />
        <FormActions cancelHref="/packages" loading={loading} dirty={isDirty} />
      </Form>
    </Card>
  );
}
