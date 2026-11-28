'use client';

import { RiMapPin2Line, RiMapPinLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm, useWatch } from 'react-hook-form';

import { AddressLocator } from '@/components/map/address-locator';
import { LocationFields } from '@/components/map/location-fields';
import { FormActions, FormCard, FormHead, FormSection, RecordGate } from '@/components/page/form-kit';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { FormSelect } from '@/components/ui/form-select';
import { useNotify } from '@/components/ui/toast';
import type { Place, PlaceInput } from '@/lib/api/models';
import { useCrud } from '@/lib/hooks/use-crud';
import { useMasterDomain } from '@/lib/hooks/use-master-domain';
import { useRecord } from '@/lib/hooks/use-record';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useT } from '@/lib/i18n/client';
import { fromGeoJsonPoint, toGeoJsonPoint } from '@/lib/map/lat-lng';
import { locationErrors, parseCoordinate } from '@/lib/map/location-input';
import { PLACE_TYPE_KEYS, placeTypeLabel } from '@/lib/places/labels';

/** De 7 a 20 caracteres con dígitos, espacios, paréntesis o guiones, y un + inicial opcional. */
const PHONE = /^\+?[\d\s()-]{7,20}$/;

interface Values {
  name: string;
  type: string;
  address: string;
  phoneNumber: string;
  contactName: string;
  lat: string;
  lng: string;
}

const EMPTY: Values = { name: '', type: '', address: '', phoneNumber: '', contactName: '', lat: '', lng: '' };

/** Formulario de lugar (alta y edición), con la dirección que se ubica en el mapa y la ubicación por campos o por mapa. */
export function PlaceForm({ id }: { id: string | null }) {
  const t = useT();
  const router = useRouter();
  const notify = useNotify();
  const api = useCrud<Place, PlaceInput>('places');
  const record = useRecord<Place>(id, api.get);
  const masters = useMasterDomain('PlaceType').all;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      if (!values.name.trim()) errors.name = { type: 'required', message: t('Este campo es obligatorio') };
      if (!values.type) errors.type = { type: 'required', message: t('Este campo es obligatorio') };
      if (values.phoneNumber.trim() && !PHONE.test(values.phoneNumber.trim())) {
        errors.phoneNumber = {
          type: 'pattern',
          message: t(
            'Escribe un teléfono válido: de 7 a 20 caracteres con dígitos, espacios, paréntesis o guiones, y un + inicial opcional'
          ),
        };
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
      name: p.name,
      type: p.type,
      address: p.address ?? '',
      phoneNumber: p.phoneNumber ?? '',
      contactName: p.contactName ?? '',
      lat: point ? String(point.lat) : '',
      lng: point ? String(point.lng) : '',
    };
  }, [record]);

  const keys = masters.length > 0 ? masters.map((m) => m.key) : [...PLACE_TYPE_KEYS];
  const stored = record.status === 'ready' ? record.record.type : '';
  const types = (stored && !keys.includes(stored) ? [...keys, stored] : keys).map((key) => ({
    key,
    label: placeTypeLabel(key, t),
  }));

  return (
    <>
      <FormHead
        title={id === null ? t('Nuevo lugar') : t('Editar lugar')}
        backLabel={t('Lugares')}
        backHref="/places"
      />
      <RecordGate state={record} backHref="/places">
        {(current) => (
          <PlaceFields
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
              const address = values.address.trim();
              const phone = values.phoneNumber.trim();
              const contact = values.contactName.trim();
              const base: PlaceInput = { name: values.name.trim(), type: values.type, location };
              try {
                if (id === null) {
                  await api.create({
                    ...base,
                    ...(address ? { address } : {}),
                    ...(phone ? { phoneNumber: phone } : {}),
                    ...(contact ? { contactName: contact } : {}),
                  });
                } else {
                  // `zoneId` no se edita aquí: se reenvía para que la actualización no lo borre
                  await api.update(id, {
                    ...base,
                    address: address || null,
                    phoneNumber: phone || null,
                    contactName: contact || null,
                    zoneId: current?.zoneId ?? null,
                  });
                }
                notify(id === null ? t('Lugar creado') : t('Lugar guardado'));
                router.push('/places');
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

function PlaceFields({
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
  const [lat, lng, address] = useWatch({ control, name: ['lat', 'lng', 'address'] });
  const dirty = { shouldDirty: true, shouldValidate: true } as const;

  return (
    <FormCard>
      <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        <FormSection title={t('Datos del lugar')} icon={RiMapPin2Line}>
          <Input
            label={t('Nombre')}
            requiredMark
            autoComplete="off"
            error={errors.name?.message}
            {...register('name')}
          />
          <FormSelect control={control} name="type" label={t('Tipo')} requiredMark error={errors.type?.message}>
            <option value="" />
            {types.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </FormSelect>
          <Input label={t('Dirección (opcional)')} autoComplete="off" {...register('address')} />
          <Input
            label={t('Teléfono (opcional)')}
            type="tel"
            autoComplete="off"
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />
          <Input label={t('Persona de contacto (opcional)')} autoComplete="off" {...register('contactName')} />
        </FormSection>
        <FormSection title={t('Ubicación')} icon={RiMapPinLine}>
          <AddressLocator
            address={address ?? ''}
            lat={lat}
            lng={lng}
            setAddress={(value) => setValue('address', value, dirty)}
            setPoint={(point) => {
              setValue('lat', String(point.lat), dirty);
              setValue('lng', String(point.lng), dirty);
            }}
          />
          <LocationFields
            latProps={register('lat')}
            lngProps={register('lng')}
            lat={lat}
            lng={lng}
            latError={errors.lat?.message}
            lngError={errors.lng?.message}
            onPick={(point) => {
              setValue('lat', String(point.lat), dirty);
              setValue('lng', String(point.lng), dirty);
            }}
          />
        </FormSection>
        <FormResult error={error} />
        <FormActions cancelHref="/places" loading={loading} dirty={isDirty} />
      </Form>
    </FormCard>
  );
}
