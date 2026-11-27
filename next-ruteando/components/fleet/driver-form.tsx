'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm } from 'react-hook-form';

import { FormActions, FormHead, FormSection, RecordGate } from '@/components/page/form-kit';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { FormSelect } from '@/components/ui/form-select';
import { PasswordField } from '@/components/ui/password-field';
import { useNotify } from '@/components/ui/toast';
import type { User, UserInput } from '@/lib/api/models';
import { IDENTIFIER_KEYS, identifierLabel } from '@/lib/fleet/labels';
import { useCrud } from '@/lib/hooks/use-crud';
import { useMasterDomain } from '@/lib/hooks/use-master-domain';
import { useRecord } from '@/lib/hooks/use-record';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useT } from '@/lib/i18n/client';

const PASSWORD_MIN_LENGTH = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Values {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  identifierType: string;
  identifierValue: string;
  password: string;
  repeatPassword: string;
}

const EMPTY: Values = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  identifierType: '',
  identifierValue: '',
  password: '',
  repeatPassword: '',
};

/** Formulario de conductor (alta y edición): datos, documento (tipo y número van juntos) y, solo en el alta, la contraseña inicial. */
export function DriverForm({ id }: { id: string | null }) {
  const t = useT();
  const router = useRouter();
  const notify = useNotify();
  const api = useCrud<User, UserInput>('users');
  const record = useRecord<User>(id, api.get);
  const masters = useMasterDomain('IdentifierType').active;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isNew = id === null;

  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      const required = t('Este campo es obligatorio');
      if (!values.firstName.trim()) errors.firstName = { type: 'required', message: required };
      if (!values.lastName.trim()) errors.lastName = { type: 'required', message: required };
      if (!values.email.trim()) errors.email = { type: 'required', message: required };
      else if (!EMAIL.test(values.email.trim()))
        errors.email = { type: 'email', message: t('Introduce un correo válido') };
      // Tipo y número de documento van juntos: si se escribe uno hace falta el otro
      if (values.identifierValue.trim() && !values.identifierType.trim()) {
        errors.identifierType = { type: 'documentType', message: t('Elige el tipo de documento') };
      }
      if (values.identifierType.trim() && !values.identifierValue.trim()) {
        errors.identifierValue = { type: 'documentValue', message: t('Escribe el número del documento') };
      }
      if (isNew) {
        if (!values.password) errors.password = { type: 'required', message: t('Introduce una contraseña inicial') };
        else if (values.password.length < PASSWORD_MIN_LENGTH) {
          errors.password = { type: 'minLength', message: t('Mínimo {0} caracteres', [PASSWORD_MIN_LENGTH]) };
        }
        if (!values.repeatPassword) {
          errors.repeatPassword = { type: 'required', message: t('Repite la contraseña inicial') };
        } else if (values.repeatPassword !== values.password) {
          errors.repeatPassword = { type: 'mismatch', message: t('Las contraseñas no coinciden') };
        }
      }
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t, isNew]
  );

  const defaults = useMemo<Values>(() => {
    if (record.status !== 'ready') return EMPTY;
    const u = record.record;
    return {
      ...EMPTY,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      email: u.email,
      phone: u.phone ?? '',
      identifierType: u.identifierType ?? '',
      identifierValue: u.identifierValue ?? '',
    };
  }, [record]);

  const storedType = record.status === 'ready' ? (record.record.identifierType ?? '') : '';
  const keys = masters.length > 0 ? masters.map((m) => m.key) : IDENTIFIER_KEYS;
  const documentTypes = (storedType && !keys.includes(storedType) ? [...keys, storedType] : keys).map((key) => ({
    key,
    label: identifierLabel(key, t),
  }));

  return (
    <>
      <FormHead
        title={isNew ? t('Nuevo conductor') : t('Editar conductor')}
        backLabel={t('Conductores')}
        backHref="/fleet/drivers"
      />
      <RecordGate state={record} backHref="/fleet/drivers">
        {(current) => (
          <DriverFields
            key={current?.id ?? 'new'}
            defaults={defaults}
            resolver={resolver}
            isNew={isNew}
            documentTypes={documentTypes}
            error={error}
            loading={loading}
            onSubmit={async (values) => {
              setLoading(true);
              setError(null);
              const document = {
                identifierType: values.identifierType.trim() || null,
                identifierValue: values.identifierValue.trim() || null,
              };
              const person = {
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                email: values.email.trim(),
                role: 'driver' as const,
                phone: values.phone.trim() || null,
              };
              const duplicate = { 409: t('Ya existe una cuenta con ese correo') };
              try {
                // Al editar se envía el documento que muestra el formulario (si no se tocó, guardar no lo borra); en el alta, solo si se escribió
                if (id === null) {
                  await api.create(
                    { ...person, ...(document.identifierValue ? document : {}), password: values.password },
                    duplicate
                  );
                } else {
                  await api.update(id, { ...person, ...document }, duplicate);
                }
                notify(id === null ? t('Conductor creado') : t('Conductor guardado'));
                router.push('/fleet/drivers');
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

function DriverFields({
  defaults,
  resolver,
  isNew,
  documentTypes,
  error,
  loading,
  onSubmit,
}: {
  defaults: Values;
  resolver: Resolver<Values>;
  isNew: boolean;
  documentTypes: { key: string; label: string }[];
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

  return (
    <Card>
      <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <FormSection title={t('Datos del conductor')}>
          <Input label={t('Nombre')} autoComplete="off" error={errors.firstName?.message} {...register('firstName')} />
          <Input label={t('Apellidos')} autoComplete="off" error={errors.lastName?.message} {...register('lastName')} />
          <Input
            label={t('Correo electrónico')}
            type="email"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input label={t('Teléfono (opcional)')} type="tel" autoComplete="off" {...register('phone')} />
          <FormSelect
            control={control}
            name="identifierType"
            label={t('Tipo de documento')}
            error={errors.identifierType?.message}
          >
            <option value="">{t('Sin documento')}</option>
            {documentTypes.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </FormSelect>
          <Input
            label={t('Número de documento')}
            autoComplete="off"
            error={errors.identifierValue?.message}
            {...register('identifierValue')}
          />
        </FormSection>
        {isNew ? (
          <FormSection title={t('Acceso')}>
            <PasswordField
              label={t('Contraseña inicial')}
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordField
              label={t('Repetir contraseña')}
              autoComplete="new-password"
              error={errors.repeatPassword?.message}
              {...register('repeatPassword')}
            />
          </FormSection>
        ) : null}
        <FormResult error={error} />
        <FormActions cancelHref="/fleet/drivers" loading={loading} dirty={isDirty} />
      </Form>
    </Card>
  );
}
